CREATE OR REPLACE FUNCTION public.check_is_broadcast_admin(p_broadcast_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.broadcast_members
    WHERE broadcast_id = p_broadcast_id AND user_id = p_user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.broadcasts
    WHERE id = p_broadcast_id AND created_by = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_broadcast_member(p_broadcast_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.broadcast_members
    WHERE broadcast_id = p_broadcast_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.set_call_logs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_workspace_invite(p_invite_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  acting_user_id uuid := auth.uid();
  acting_user_email text;
  invite_record public.workspace_invites%ROWTYPE;
BEGIN
  IF acting_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO acting_user_email
  FROM public.profiles
  WHERE id = acting_user_id;

  SELECT * INTO invite_record
  FROM public.workspace_invites
  WHERE invite_token = p_invite_token
  LIMIT 1;

  IF invite_record.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF invite_record.accepted_at IS NOT NULL THEN
    RETURN invite_record.workspace_id;
  END IF;

  IF invite_record.expires_at <= now() THEN
    RAISE EXCEPTION 'This invite has expired';
  END IF;

  IF lower(coalesce(acting_user_email, '')) <> lower(invite_record.invited_email) THEN
    RAISE EXCEPTION 'This invite belongs to a different email address';
  END IF;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, invited_by)
  VALUES (invite_record.workspace_id, acting_user_id, invite_record.role, invite_record.invited_by)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = excluded.role,
      invited_by = excluded.invited_by,
      is_active = true,
      removed_at = NULL;

  UPDATE public.workspace_invites
  SET claimed_at = coalesce(claimed_at, now()),
      accepted_at = now()
  WHERE id = invite_record.id;

  UPDATE public.profiles
  SET admin_user_id = coalesce(admin_user_id, invite_record.invited_by)
  WHERE id = acting_user_id
    AND invite_record.invited_by <> acting_user_id;

  INSERT INTO public.channel_members (channel_id, user_id, role)
  SELECT c.id, acting_user_id, 'member'
  FROM public.channels c
  WHERE c.workspace_id = invite_record.workspace_id
    AND c.is_private = false
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  RETURN invite_record.workspace_id;
END;
$$;