/*
  Reduce browser-side chat fan-out.

  The DM sidebar previously loaded latest message and unread count with two
  requests per direct message. This function keeps the same result shape but
  performs the indexed lookups in one round trip.
*/

CREATE OR REPLACE FUNCTION public.get_dm_sidebar_summaries(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  user1_id uuid,
  user2_id uuid,
  user1_last_read_at timestamptz,
  user2_last_read_at timestamptz,
  created_at timestamptz,
  other_user_id uuid,
  other_email text,
  other_full_name text,
  other_avatar_url text,
  other_avatar_color text,
  other_is_signedin boolean,
  other_last_seen timestamptz,
  latest_content text,
  latest_created_at timestamptz,
  latest_user_id uuid,
  latest_attachment_name text,
  latest_attachment_type text,
  latest_is_deleted boolean,
  unread_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dm.id,
    dm.user1_id,
    dm.user2_id,
    dm.user1_last_read_at,
    dm.user2_last_read_at,
    dm.created_at,
    other_profile.id AS other_user_id,
    other_profile.email AS other_email,
    other_profile.full_name AS other_full_name,
    other_profile.avatar_url AS other_avatar_url,
    other_profile.avatar_color AS other_avatar_color,
    other_profile.is_signedin AS other_is_signedin,
    other_profile.last_seen AS other_last_seen,
    latest_message.content AS latest_content,
    latest_message.created_at AS latest_created_at,
    latest_message.user_id AS latest_user_id,
    latest_message.attachment_name AS latest_attachment_name,
    latest_message.attachment_type AS latest_attachment_type,
    latest_message.is_deleted AS latest_is_deleted,
    COALESCE(unread_messages.unread_count, 0) AS unread_count
  FROM public.direct_messages dm
  JOIN public.profiles other_profile
    ON other_profile.id = CASE
      WHEN dm.user1_id = auth.uid() THEN dm.user2_id
      ELSE dm.user1_id
    END
  LEFT JOIN LATERAL (
    SELECT
      message.content,
      message.created_at,
      message.user_id,
      message.attachment_name,
      message.attachment_type,
      message.is_deleted
    FROM public.direct_message_messages message
    WHERE message.dm_id = dm.id
      AND message.thread_id IS NULL
    ORDER BY message.created_at DESC
    LIMIT 1
  ) latest_message ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS unread_count
    FROM public.direct_message_messages message
    WHERE message.dm_id = dm.id
      AND message.thread_id IS NULL
      AND message.user_id <> auth.uid()
      AND message.created_at > CASE
        WHEN dm.user1_id = auth.uid() THEN dm.user1_last_read_at
        ELSE dm.user2_last_read_at
      END
  ) unread_messages ON true
  WHERE dm.workspace_id = p_workspace_id
    AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.get_dm_sidebar_summaries(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chat_detail_counts(
  p_channel_id uuid DEFAULT NULL,
  p_dm_id uuid DEFAULT NULL
)
RETURNS TABLE (
  bookmark_count bigint,
  pin_count bigint,
  todo_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  can_read_conversation boolean;
BEGIN
  IF p_channel_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.channel_members member
      WHERE member.channel_id = p_channel_id
        AND member.user_id = auth.uid()
    )
    INTO can_read_conversation;

    IF NOT can_read_conversation THEN
      RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      (
        SELECT count(*)::bigint
        FROM public.message_bookmarks bookmark
        JOIN public.messages message ON message.id = bookmark.message_id
        WHERE bookmark.user_id = auth.uid()
          AND message.channel_id = p_channel_id
      ) AS bookmark_count,
      (
        SELECT count(*)::bigint
        FROM public.pinned_messages pin
        WHERE pin.channel_id = p_channel_id
      ) AS pin_count,
      (
        SELECT count(*)::bigint
        FROM public.message_todos todo
        WHERE todo.channel_id = p_channel_id
      ) AS todo_count;
    RETURN;
  END IF;

  IF p_dm_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.direct_messages dm
      WHERE dm.id = p_dm_id
        AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid())
    )
    INTO can_read_conversation;

    IF NOT can_read_conversation THEN
      RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      (
        SELECT count(*)::bigint
        FROM public.message_bookmarks bookmark
        JOIN public.direct_message_messages message
          ON message.id = bookmark.message_id
        WHERE bookmark.user_id = auth.uid()
          AND message.dm_id = p_dm_id
      ) AS bookmark_count,
      (
        SELECT count(*)::bigint
        FROM public.pinned_messages pin
        WHERE pin.dm_id = p_dm_id
      ) AS pin_count,
      (
        SELECT count(*)::bigint
        FROM public.message_todos todo
        WHERE todo.dm_id = p_dm_id
      ) AS todo_count;
    RETURN;
  END IF;

  RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_detail_counts(uuid, uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_message_todos_channel
  ON public.message_todos(channel_id)
  WHERE channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_todos_dm
  ON public.message_todos(dm_id)
  WHERE dm_id IS NOT NULL;
