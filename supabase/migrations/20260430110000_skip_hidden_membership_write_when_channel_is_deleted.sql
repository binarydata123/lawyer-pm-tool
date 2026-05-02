/*
  # Skip hidden-membership writes while a channel is being deleted

  When a channel is deleted, its `channel_members` rows are cascade-deleted.
  The member-system-message trigger previously treated those deletes the same as
  a user leaving a live channel, which caused it to re-insert
  `channel_hidden_memberships` rows for a channel that no longer exists.

  This migration updates the trigger function so it only writes hidden
  memberships and leave/remove system messages when the parent channel still
  exists.
*/

CREATE OR REPLACE FUNCTION public.create_channel_member_system_message()
RETURNS trigger AS $$
DECLARE
  actor_id uuid := auth.uid();
  actor_name text;
  target_name text;
  message_type text;
  message_channel_id uuid;
  message_user_id uuid;
  channel_still_exists boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    message_channel_id := NEW.channel_id;
    message_user_id := COALESCE(actor_id, NEW.user_id);

    DELETE FROM public.channel_hidden_memberships hidden
    WHERE hidden.channel_id = NEW.channel_id
      AND hidden.user_id = NEW.user_id;

    SELECT COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1), 'Someone')
    INTO actor_name
    FROM public.profiles
    WHERE id = message_user_id;

    SELECT COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1), 'someone')
    INTO target_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF actor_id IS NOT NULL AND actor_id <> NEW.user_id THEN
      message_type := 'member_added';
    ELSE
      message_type := 'member_joined';
    END IF;

    INSERT INTO public.messages (channel_id, user_id, content)
    VALUES (
      message_channel_id,
      message_user_id,
      '__channel_system__:' || jsonb_build_object(
        'type', message_type,
        'actorName', COALESCE(actor_name, 'Someone'),
        'targetName', COALESCE(target_name, 'someone')
      )::text
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    message_channel_id := OLD.channel_id;
    message_user_id := COALESCE(actor_id, OLD.user_id);

    SELECT EXISTS (
      SELECT 1
      FROM public.channels
      WHERE id = OLD.channel_id
    )
    INTO channel_still_exists;

    IF NOT channel_still_exists THEN
      RETURN OLD;
    END IF;

    INSERT INTO public.channel_hidden_memberships (channel_id, user_id)
    VALUES (OLD.channel_id, OLD.user_id)
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET hidden_at = now();

    SELECT COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1), 'Someone')
    INTO actor_name
    FROM public.profiles
    WHERE id = message_user_id;

    SELECT COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1), 'someone')
    INTO target_name
    FROM public.profiles
    WHERE id = OLD.user_id;

    IF actor_id IS NOT NULL AND actor_id <> OLD.user_id THEN
      message_type := 'member_removed';
    ELSE
      message_type := 'member_left';
    END IF;

    INSERT INTO public.messages (channel_id, user_id, content)
    VALUES (
      message_channel_id,
      message_user_id,
      '__channel_system__:' || jsonb_build_object(
        'type', message_type,
        'actorName', COALESCE(actor_name, 'Someone'),
        'targetName', COALESCE(target_name, 'someone')
      )::text
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
