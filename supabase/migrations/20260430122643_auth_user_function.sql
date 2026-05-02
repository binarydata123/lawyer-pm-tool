CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  color text;
  resolved_admin_user_id uuid;
  resolved_workspace_id uuid;
  admin_invite_token text;
  channel_invite_token text;
  resolved_name text;
  resolved_slug text;
begin
  color := 'hsl(' || floor(random() * 360) || ', 70%, 50%)';
  admin_invite_token := nullif(new.raw_user_meta_data->>'admin_invite_token', '');
  channel_invite_token := nullif(new.raw_user_meta_data->>'channel_invite_token', '');

  insert into public.profiles (id, email, full_name, avatar_color, admin_user_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'User'),
    color,
    null
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  begin
    if admin_invite_token is not null then
      select invited_by, workspace_id
      into resolved_admin_user_id, resolved_workspace_id
      from public.workspace_invites
      where invite_token = admin_invite_token
        and lower(invited_email) = lower(new.email)
        and accepted_at is null
        and expires_at > now()
      limit 1;

      if resolved_workspace_id is null then
        select invited_by, workspace_id
        into resolved_admin_user_id, resolved_workspace_id
        from public.admin_user_invites
        where invite_token = admin_invite_token
          and lower(invited_email) = lower(new.email)
          and accepted_at is null
          and expires_at > now()
        limit 1;
      end if;
    end if;

    if resolved_workspace_id is null and channel_invite_token is not null then
      select invited_by, workspace_id
      into resolved_admin_user_id, resolved_workspace_id
      from public.channel_invites
      where invite_token = channel_invite_token
        and lower(invited_email) = lower(new.email)
        and expires_at > now()
      limit 1;
    end if;

    update public.profiles
    set admin_user_id = resolved_admin_user_id
    where id = new.id
      and resolved_admin_user_id is not null;

    if resolved_workspace_id is null then
      select coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1), 'My') || '''s workspace'
      into resolved_name
      from public.profiles
      where id = new.id;

      resolved_slug :=
        public.slugify_workspace_name(resolved_name)
        || '-' || left(replace(new.id::text, '-', ''), 8);

      insert into public.workspaces (name, slug, created_by, is_personal)
      values (resolved_name, resolved_slug, new.id, true)
      on conflict do nothing;

      select id
      into resolved_workspace_id
      from public.workspaces
      where created_by = new.id
        and is_personal = true
      limit 1;

      insert into public.workspace_members (workspace_id, user_id, role, invited_by, is_active, removed_at)
      values (resolved_workspace_id, new.id, 'owner', new.id, true, null)
      on conflict (workspace_id, user_id) do update
      set role = 'owner', is_active = true, removed_at = null;

      insert into public.channels (name, description, is_private, created_by, workspace_id)
      values
        ('general', '', false, new.id, resolved_workspace_id),
        ('ideas', '', false, new.id, resolved_workspace_id),
        ('support', '', false, new.id, resolved_workspace_id)
      on conflict do nothing;

      insert into public.channel_members (channel_id, user_id, role)
      select c.id, new.id, 'admin'
      from public.channels c
      where c.workspace_id = resolved_workspace_id
        and c.created_by = new.id
      on conflict (channel_id, user_id) do nothing;

    else
      insert into public.workspace_members (workspace_id, user_id, role, invited_by, is_active, removed_at)
      values (resolved_workspace_id, new.id, 'member', resolved_admin_user_id, true, null)
      on conflict (workspace_id, user_id) do update
      set is_active = true, removed_at = null;

      insert into public.channel_members (channel_id, user_id, role)
      select c.id, new.id, 'member'
      from public.channels c
      where c.workspace_id = resolved_workspace_id
        and c.is_private = false
      on conflict (channel_id, user_id) do nothing;
    end if;

  exception when others then
    insert into public.signup_trigger_errors (user_id, email, error_message)
    values (new.id, new.email, sqlerrm);
  end;

  return new;
end;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();