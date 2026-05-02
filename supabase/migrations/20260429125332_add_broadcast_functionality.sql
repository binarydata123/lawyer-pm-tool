/*
  # Add Broadcast Functionality

  This migration introduces tables for broadcasts, broadcast members, and broadcast messages.
  It also modifies existing chat-related tables to support broadcasts and adds
  a trigger to automatically create direct messages for broadcast members.
*/

-- 1. Create 'broadcasts' table
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

-- 2. Create 'broadcast_members' table
CREATE TABLE IF NOT EXISTS public.broadcast_members (
  broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(), -- To track read state for the broadcast itself
  PRIMARY KEY (broadcast_id, user_id)
);

-- 3. Create 'broadcast_messages' table
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid CONSTRAINT broadcast_messages_user_id_fkey REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  thread_id uuid REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
  reply_count integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  is_edited boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL
);

-- Ensure columns exist if table was already created in a previous migration run
ALTER TABLE public.broadcast_messages 
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reply_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- 4. Add 'broadcast_message_id' to 'direct_message_messages'
ALTER TABLE public.direct_message_messages
  ADD COLUMN IF NOT EXISTS broadcast_message_id uuid REFERENCES public.broadcast_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_direct_message_messages_broadcast_message_id
  ON public.direct_message_messages(broadcast_message_id);

-- 5. Update existing tables to support 'broadcast_id'
--    a. chat_archives
ALTER TABLE public.chat_archives
  ADD COLUMN IF NOT EXISTS broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE CASCADE;

ALTER TABLE public.chat_archives
  DROP CONSTRAINT IF EXISTS chat_archives_one_chat;
ALTER TABLE public.chat_archives
  ADD CONSTRAINT chat_archives_one_chat CHECK (
    (channel_id IS NOT NULL AND dm_id IS NULL AND broadcast_id IS NULL) OR
    (channel_id IS NULL AND dm_id IS NOT NULL AND broadcast_id IS NULL) OR
    (channel_id IS NULL AND dm_id IS NULL AND broadcast_id IS NOT NULL)
  );

ALTER TABLE public.chat_archives
  DROP CONSTRAINT IF EXISTS chat_archives_unique_channel;
ALTER TABLE public.chat_archives
  DROP CONSTRAINT IF EXISTS chat_archives_unique_dm;
ALTER TABLE public.chat_archives
  DROP CONSTRAINT IF EXISTS chat_archives_unique_chat;
ALTER TABLE public.chat_archives
  ADD CONSTRAINT chat_archives_unique_chat UNIQUE (user_id, channel_id, dm_id, broadcast_id);

--    b. pinned_messages
ALTER TABLE public.pinned_messages
  ADD COLUMN IF NOT EXISTS broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE CASCADE;

ALTER TABLE public.pinned_messages
  DROP CONSTRAINT IF EXISTS pinned_messages_one_chat;
ALTER TABLE public.pinned_messages
  ADD CONSTRAINT pinned_messages_one_chat CHECK (
    (channel_id IS NOT NULL AND dm_id IS NULL AND broadcast_id IS NULL) OR
    (channel_id IS NULL AND dm_id IS NOT NULL AND broadcast_id IS NULL) OR
    (channel_id IS NULL AND dm_id IS NULL AND broadcast_id IS NOT NULL)
  );

--    c. message_todos
ALTER TABLE public.message_todos
  ADD COLUMN IF NOT EXISTS broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE CASCADE;

ALTER TABLE public.message_todos
  DROP CONSTRAINT IF EXISTS message_todos_one_conversation;
ALTER TABLE public.message_todos
  ADD CONSTRAINT message_todos_one_conversation CHECK (
    (channel_id IS NOT NULL AND dm_id IS NULL AND broadcast_id IS NULL AND message_source = 'channel') OR
    (channel_id IS NULL AND dm_id IS NOT NULL AND broadcast_id IS NULL AND message_source = 'dm') OR
    (channel_id IS NULL AND dm_id IS NULL AND broadcast_id IS NOT NULL AND message_source = 'broadcast')
  );

ALTER TABLE public.message_todos
  DROP CONSTRAINT IF EXISTS message_todos_message_id_message_source_key;
ALTER TABLE public.message_todos
  ADD CONSTRAINT message_todos_message_id_message_source_key UNIQUE (message_id, message_source);

-- 5d. Create 'broadcast_hidden_memberships' table
CREATE TABLE IF NOT EXISTS public.broadcast_hidden_memberships (
  broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (broadcast_id, user_id)
);

-- 6. RLS Policies for new tables
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_hidden_memberships ENABLE ROW LEVEL SECURITY;

-- Helper functions to avoid recursion in RLS
CREATE OR REPLACE FUNCTION public.check_is_broadcast_member(p_broadcast_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.broadcast_members
    WHERE broadcast_id = p_broadcast_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_broadcast_admin(p_broadcast_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.broadcast_members
    WHERE broadcast_id = p_broadcast_id AND user_id = p_user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.broadcasts
    WHERE id = p_broadcast_id AND created_by = p_user_id
  );
$$;

-- Broadcasts RLS
DROP POLICY IF EXISTS "Workspace members can view broadcasts" ON public.broadcasts;
CREATE POLICY "Workspace members can view broadcasts"
  ON public.broadcasts FOR SELECT
  TO authenticated
  USING (
    public.check_is_broadcast_member(id, auth.uid()) OR
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can create broadcasts" ON public.broadcasts;
CREATE POLICY "Users can create broadcasts"
  ON public.broadcasts FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Broadcast admins can update broadcasts" ON public.broadcasts;
CREATE POLICY "Broadcast admins can update broadcasts"
  ON public.broadcasts FOR UPDATE
  TO authenticated
  USING (public.check_is_broadcast_admin(id, auth.uid()))
  WITH CHECK (public.check_is_broadcast_admin(id, auth.uid()));

DROP POLICY IF EXISTS "Broadcast admins can delete broadcasts" ON public.broadcasts;
CREATE POLICY "Broadcast admins can delete broadcasts"
  ON public.broadcasts FOR DELETE
  TO authenticated
  USING (public.check_is_broadcast_admin(id, auth.uid()));

-- Broadcast Members RLS
DROP POLICY IF EXISTS "Broadcast members can view their memberships" ON public.broadcast_members;
CREATE POLICY "Broadcast members can view their memberships"
  ON public.broadcast_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.check_is_broadcast_admin(broadcast_id, auth.uid()));

DROP POLICY IF EXISTS "Broadcast admins can add members" ON public.broadcast_members;
CREATE POLICY "Broadcast admins can add members"
  ON public.broadcast_members FOR INSERT
  TO authenticated
  WITH CHECK (public.check_is_broadcast_admin(broadcast_id, auth.uid()));

DROP POLICY IF EXISTS "Broadcast admins can update members" ON public.broadcast_members;
CREATE POLICY "Broadcast admins can update members"
  ON public.broadcast_members FOR UPDATE
  TO authenticated
  USING (public.check_is_broadcast_admin(broadcast_id, auth.uid()))
  WITH CHECK (public.check_is_broadcast_admin(broadcast_id, auth.uid()));

DROP POLICY IF EXISTS "Broadcast admins can remove members" ON public.broadcast_members;
CREATE POLICY "Broadcast admins can remove members"
  ON public.broadcast_members FOR DELETE
  TO authenticated
  USING (public.check_is_broadcast_admin(broadcast_id, auth.uid()));

DROP POLICY IF EXISTS "Members can update their own row" ON public.broadcast_members;
CREATE POLICY "Members can update their own row"
  ON public.broadcast_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Broadcast Messages RLS
DROP POLICY IF EXISTS "Broadcast members can view messages" ON public.broadcast_messages;
CREATE POLICY "Broadcast members can view messages"
  ON public.broadcast_messages FOR SELECT
  TO authenticated
  USING (public.check_is_broadcast_member(broadcast_id, auth.uid()));

DROP POLICY IF EXISTS "Broadcast members can insert messages" ON public.broadcast_messages;
CREATE POLICY "Broadcast members can insert messages"
  ON public.broadcast_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.check_is_broadcast_member(broadcast_id, auth.uid()));

DROP POLICY IF EXISTS "Broadcast message owners can update messages" ON public.broadcast_messages;
CREATE POLICY "Broadcast message owners can update messages"
  ON public.broadcast_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Broadcast message owners can delete messages" ON public.broadcast_messages;
CREATE POLICY "Broadcast message owners can delete messages"
  ON public.broadcast_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Broadcast Hidden Memberships RLS
DROP POLICY IF EXISTS "Users can view their own hidden broadcasts" ON public.broadcast_hidden_memberships;
CREATE POLICY "Users can view their own hidden broadcasts"
  ON public.broadcast_hidden_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can hide their own broadcasts" ON public.broadcast_hidden_memberships;
CREATE POLICY "Users can hide their own broadcasts"
  ON public.broadcast_hidden_memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can unhide their own broadcasts" ON public.broadcast_hidden_memberships;
CREATE POLICY "Users can unhide their own broadcasts"
  ON public.broadcast_hidden_memberships FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS for direct_message_messages (to allow linking to broadcast_messages)
-- No direct change needed here, as existing policies should cover access to DMs.
-- The link is via broadcast_message_id, which is just a foreign key.

-- 7. Update RLS for existing tables to include broadcast_id
--    a. chat_archives
DROP POLICY IF EXISTS "Users can view their archived chats" ON public.chat_archives;
CREATE POLICY "Users can view their archived chats"
  ON public.chat_archives
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can archive their own chats" ON public.chat_archives;
CREATE POLICY "Users can archive their own chats"
  ON public.chat_archives
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own archived chats" ON public.chat_archives;
CREATE POLICY "Users can update their own archived chats"
  ON public.chat_archives
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unarchive their own chats" ON public.chat_archives;
CREATE POLICY "Users can unarchive their own chats"
  ON public.chat_archives
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

--    b. pinned_messages
DROP POLICY IF EXISTS "Channel members can view pinned messages" ON public.pinned_messages;
DROP POLICY IF EXISTS "DM participants can view pinned messages" ON public.pinned_messages;
DROP POLICY IF EXISTS "Chat participants can view pinned messages" ON public.pinned_messages;
CREATE POLICY "Chat participants can view pinned messages"
  ON public.pinned_messages FOR SELECT
  TO authenticated
  USING (
    (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = pinned_messages.channel_id AND cm.user_id = auth.uid())) OR
    (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = pinned_messages.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
    (broadcast_id IS NOT NULL AND public.check_is_broadcast_member(broadcast_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Channel members can pin messages" ON public.pinned_messages;
DROP POLICY IF EXISTS "DM participants can pin messages" ON public.pinned_messages;
DROP POLICY IF EXISTS "Chat participants can pin messages" ON public.pinned_messages;
CREATE POLICY "Chat participants can pin messages"
  ON public.pinned_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    pinned_by = auth.uid() AND (
      (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = pinned_messages.channel_id AND cm.user_id = auth.uid())) OR
      (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = pinned_messages.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
      (broadcast_id IS NOT NULL AND public.check_is_broadcast_member(broadcast_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Channel members can unpin messages" ON public.pinned_messages;
DROP POLICY IF EXISTS "DM participants can unpin messages" ON public.pinned_messages;
DROP POLICY IF EXISTS "Chat participants can unpin messages" ON public.pinned_messages;
CREATE POLICY "Chat participants can unpin messages"
  ON public.pinned_messages FOR DELETE
  TO authenticated
  USING (pinned_by = auth.uid());

--    c. message_todos
DROP POLICY IF EXISTS "Chat participants can view message todos" ON public.message_todos;
CREATE POLICY "Chat participants can view message todos"
  ON public.message_todos FOR SELECT
  TO authenticated
  USING (
    (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = message_todos.channel_id AND cm.user_id = auth.uid())) OR
    (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = message_todos.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
    (broadcast_id IS NOT NULL AND public.check_is_broadcast_member(broadcast_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Chat participants can create message todos" ON public.message_todos;
CREATE POLICY "Chat participants can create message todos"
  ON public.message_todos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = message_todos.channel_id AND cm.user_id = auth.uid())) OR
      (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = message_todos.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
      (broadcast_id IS NOT NULL AND public.check_is_broadcast_member(broadcast_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Chat participants can update message todos" ON public.message_todos;
CREATE POLICY "Chat participants can update message todos"
  ON public.message_todos FOR UPDATE
  TO authenticated
  USING (
    (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = message_todos.channel_id AND cm.user_id = auth.uid())) OR
    (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = message_todos.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
    (broadcast_id IS NOT NULL AND public.check_is_broadcast_member(broadcast_id, auth.uid()))
  )
  WITH CHECK (
    (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = message_todos.channel_id AND cm.user_id = auth.uid())) OR
    (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = message_todos.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
    (broadcast_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.broadcast_members bm WHERE bm.broadcast_id = message_todos.broadcast_id AND bm.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Chat participants can delete message todos" ON public.message_todos;
CREATE POLICY "Chat participants can delete message todos"
  ON public.message_todos FOR DELETE
  TO authenticated
  USING (
    (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = message_todos.channel_id AND cm.user_id = auth.uid())) OR
    (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = message_todos.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
    (broadcast_id IS NOT NULL AND public.check_is_broadcast_member(broadcast_id, auth.uid()))
  );
-- 8. Realtime for new tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'broadcasts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'broadcast_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'broadcast_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'broadcast_hidden_memberships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_hidden_memberships;
  END IF;
END $$;

-- 9. Trigger to create DM messages for broadcast members
CREATE OR REPLACE FUNCTION public.create_dm_messages_for_broadcast_members()
RETURNS TRIGGER AS $$
DECLARE
  member_record public.broadcast_members%ROWTYPE;
  dm_conversation_id uuid;
  sender_id uuid := NEW.user_id;
  broadcast_workspace_id uuid := NEW.workspace_id;
BEGIN
  -- Iterate over all members of the broadcast
  FOR member_record IN
    SELECT * FROM public.broadcast_members
    WHERE broadcast_id = NEW.broadcast_id AND user_id <> sender_id
  LOOP
    -- Find or create a direct message conversation between sender and member
    SELECT id INTO dm_conversation_id
    FROM public.direct_messages
    WHERE
      workspace_id = broadcast_workspace_id AND
      ((user1_id = sender_id AND user2_id = member_record.user_id) OR
       (user1_id = member_record.user_id AND user2_id = sender_id));

    IF dm_conversation_id IS NULL THEN
      INSERT INTO public.direct_messages (workspace_id, user1_id, user2_id)
      VALUES (broadcast_workspace_id, LEAST(sender_id, member_record.user_id), GREATEST(sender_id, member_record.user_id))
      RETURNING id INTO dm_conversation_id;
    END IF;

    -- Insert a direct message for the member
    INSERT INTO public.direct_message_messages (
      dm_id,
      user_id,
      content,
      attachment_url,
      attachment_name,
      attachment_type,
      attachment_size,
      workspace_id,
      broadcast_message_id -- Link back to the original broadcast message
    )
    VALUES (
      dm_conversation_id,
      sender_id, -- The sender of the broadcast message is also the sender of the DM
      NEW.content,
      NEW.attachment_url,
      NEW.attachment_name,
      NEW.attachment_type,
      NEW.attachment_size,
      broadcast_workspace_id,
      NEW.id -- Link to the broadcast_messages.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_broadcast_message_created ON public.broadcast_messages;
CREATE TRIGGER on_broadcast_message_created
AFTER INSERT ON public.broadcast_messages
FOR EACH ROW
EXECUTE FUNCTION public.create_dm_messages_for_broadcast_members();

-- 10. RPC Function to get broadcast sidebar summaries
CREATE OR REPLACE FUNCTION public.get_broadcast_sidebar_summaries(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  created_at timestamptz,
  latest_content text,
  latest_created_at timestamptz,
  latest_user_id uuid,
  latest_attachment_name text,
  latest_attachment_type text,
  latest_is_deleted boolean,
  unread_count bigint,
  is_member boolean,
  is_admin boolean,
  archived_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.created_at,
    latest_bm.content AS latest_content,
    latest_bm.created_at AS latest_created_at,
    latest_bm.user_id AS latest_user_id,
    latest_bm.attachment_name AS latest_attachment_name,
    latest_bm.attachment_type AS latest_attachment_type,
    latest_bm.is_deleted AS latest_is_deleted,
    COALESCE(unread_messages.unread_count, 0) AS unread_count,
    TRUE AS is_member, -- User is always a member if they see it in sidebar
    (bm.role = 'admin') AS is_admin,
    ca.archived_at
  FROM public.broadcasts b
  JOIN public.broadcast_members bm ON b.id = bm.broadcast_id
  LEFT JOIN public.chat_archives ca ON b.id = ca.broadcast_id AND ca.user_id = current_user_id
  LEFT JOIN LATERAL (
    SELECT
      bm_inner.content,
      bm_inner.created_at,
      bm_inner.user_id,
      bm_inner.attachment_name,
      bm_inner.attachment_type,
      bm_inner.is_deleted
    FROM public.broadcast_messages bm_inner
    WHERE bm_inner.broadcast_id = b.id
    ORDER BY bm_inner.created_at DESC
    LIMIT 1
  ) latest_bm ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS unread_count
    FROM public.broadcast_messages bm_unread
    WHERE bm_unread.broadcast_id = b.id
      AND bm_unread.user_id <> current_user_id
      AND bm_unread.created_at > bm.last_read_at
  ) unread_messages ON true
  WHERE b.workspace_id = p_workspace_id
    AND bm.user_id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_broadcast_sidebar_summaries(uuid) TO authenticated;

-- 11. Update RPC Function to get chat detail counts
CREATE OR REPLACE FUNCTION public.get_chat_detail_counts(
  p_channel_id uuid DEFAULT NULL,
  p_dm_id uuid DEFAULT NULL,
  p_broadcast_id uuid DEFAULT NULL
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

  IF p_broadcast_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.broadcast_members bm
      WHERE bm.broadcast_id = p_broadcast_id
        AND bm.user_id = auth.uid()
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
        JOIN public.broadcast_messages message ON message.id = bookmark.message_id
        WHERE bookmark.user_id = auth.uid()
          AND message.broadcast_id = p_broadcast_id
      ) AS bookmark_count,
      (
        SELECT count(*)::bigint
        FROM public.pinned_messages pin
        WHERE pin.broadcast_id = p_broadcast_id
      ) AS pin_count,
      (
        SELECT count(*)::bigint
        FROM public.message_todos todo
        WHERE todo.broadcast_id = p_broadcast_id
      ) AS todo_count;
    RETURN;
  END IF;

  RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_detail_counts(uuid, uuid, uuid) TO authenticated;

-- 12. Add updated_at trigger for broadcast_messages
CREATE OR REPLACE FUNCTION public.set_broadcast_messages_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_broadcast_messages_updated_at ON public.broadcast_messages;
CREATE TRIGGER set_broadcast_messages_updated_at
BEFORE UPDATE ON public.broadcast_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_broadcast_messages_updated_at();

-- 13. Add indexes for broadcast_messages
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_broadcast_id_created_at
  ON public.broadcast_messages(broadcast_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_workspace_id
  ON public.broadcast_messages(workspace_id);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_thread_id
  ON public.broadcast_messages(thread_id);

-- 14. Update message_todos_message_id_message_source_key constraint
-- This constraint was already updated in the previous migration, ensuring it's unique across source.
-- No further changes needed here, just ensuring it's compatible with 'broadcast' source.

-- 15. Update message_reactions to include broadcast_id
ALTER TABLE public.message_reactions
  ADD COLUMN IF NOT EXISTS broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE CASCADE;

-- Update existing reactions to populate broadcast_id if message_id corresponds to a broadcast_message
UPDATE public.message_reactions reaction
SET
  broadcast_id = broadcast_message.broadcast_id,
  workspace_id = broadcast_message.workspace_id
FROM public.broadcast_messages broadcast_message
WHERE reaction.message_id = broadcast_message.id
  AND reaction.broadcast_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_reactions_broadcast
  ON public.message_reactions(broadcast_id)
  WHERE broadcast_id IS NOT NULL;

-- Update RLS for message_reactions
DROP POLICY IF EXISTS "Users can view message reactions" ON public.message_reactions;
CREATE POLICY "Users can view message reactions"
  ON public.message_reactions FOR SELECT
  TO authenticated
  USING (
    (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = message_reactions.channel_id AND cm.user_id = auth.uid())) OR
    (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = message_reactions.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
    (broadcast_id IS NOT NULL AND public.check_is_broadcast_member(broadcast_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert message reactions" ON public.message_reactions;
CREATE POLICY "Users can insert message reactions"
  ON public.message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = message_reactions.channel_id AND cm.user_id = auth.uid())) OR
      (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = message_reactions.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
      (broadcast_id IS NOT NULL AND public.check_is_broadcast_member(broadcast_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can delete own message reactions" ON public.message_reactions;
CREATE POLICY "Users can delete own message reactions"
  ON public.message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 16. Update typing_indicators to include broadcast_id
ALTER TABLE public.typing_indicators
  ADD COLUMN IF NOT EXISTS broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE CASCADE;

-- Update existing typing_indicators to populate broadcast_id if message_id corresponds to a broadcast_message
-- This is not directly applicable as typing indicators are per conversation, not per message.
-- However, we need to update the RLS for typing_indicators.

ALTER TABLE public.typing_indicators
  DROP CONSTRAINT IF EXISTS typing_indicators_one_chat;
ALTER TABLE public.typing_indicators
  ADD CONSTRAINT typing_indicators_one_chat CHECK (
    (channel_id IS NOT NULL AND dm_id IS NULL AND broadcast_id IS NULL) OR
    (channel_id IS NULL AND dm_id IS NOT NULL AND broadcast_id IS NULL) OR
    (channel_id IS NULL AND dm_id IS NULL AND broadcast_id IS NOT NULL)
  );

-- Update RLS for typing_indicators
DROP POLICY IF EXISTS "Users can view typing indicators" ON public.typing_indicators;
CREATE POLICY "Users can view typing indicators"
  ON public.typing_indicators FOR SELECT
  TO authenticated
  USING (
    (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = typing_indicators.channel_id AND cm.user_id = auth.uid())) OR
    (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = typing_indicators.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
    (broadcast_id IS NOT NULL AND public.check_is_broadcast_member(broadcast_id, auth.uid()))
  );

DROP POLICY IF EXISTS "Users can insert typing indicators" ON public.typing_indicators;
CREATE POLICY "Users can insert typing indicators"
  ON public.typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      (channel_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.channel_members cm WHERE cm.channel_id = typing_indicators.channel_id AND cm.user_id = auth.uid())) OR
      (dm_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.direct_messages dm WHERE dm.id = typing_indicators.dm_id AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid()))) OR
      (broadcast_id IS NOT NULL AND public.check_is_broadcast_member(broadcast_id, auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can delete own typing indicators" ON public.typing_indicators;
CREATE POLICY "Users can delete own typing indicators"
  ON public.typing_indicators FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 17. Update message_hidden_for_users to include broadcast_messages
-- No direct column change needed, but source_table check should be updated if applicable.
-- For now, assume message_hidden_for_users will refer to broadcast_messages via message_id and source_table='broadcast_messages'.

-- 18. Update notify_pin trigger function to handle broadcasts
CREATE OR REPLACE FUNCTION public.notify_pin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dm_recipient uuid;
BEGIN
  -- CHANNEL PIN
  IF NEW.channel_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, entity_id, actor_id, data)
    SELECT cm.user_id, 'pin', 'Message pinned', 'A message was pinned', NEW.message_id, NEW.pinned_by,
           jsonb_build_object('channel_id', NEW.channel_id, 'message_id', NEW.message_id)
    FROM public.channel_members cm
    JOIN public.profiles p ON p.id = cm.user_id
    WHERE cm.channel_id = NEW.channel_id
      AND cm.user_id != NEW.pinned_by
      AND (p.is_signedin = false OR p.last_seen IS NULL OR p.last_seen < NOW() - INTERVAL '90 seconds');
  END IF;

  -- DM PIN
  IF NEW.dm_id IS NOT NULL THEN
    SELECT CASE WHEN dm.user1_id = NEW.pinned_by THEN dm.user2_id ELSE dm.user1_id END
    INTO dm_recipient
    FROM public.direct_messages dm WHERE dm.id = NEW.dm_id;

    IF dm_recipient IS NOT NULL AND dm_recipient != NEW.pinned_by THEN
      INSERT INTO notifications (user_id, type, title, body, entity_id, actor_id, data)
      SELECT p.id, 'pin', 'Message pinned', 'A message was pinned', NEW.message_id, NEW.pinned_by,
             jsonb_build_object('dm_id', NEW.dm_id, 'recipient_id', dm_recipient, 'message_id', NEW.message_id)
      FROM public.profiles p
      WHERE p.id = dm_recipient
        AND (p.is_signedin = false OR p.last_seen IS NULL OR p.last_seen < NOW() - INTERVAL '40 seconds');
    END IF;
  END IF;

  -- BROADCAST PIN
  IF NEW.broadcast_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, body, entity_id, actor_id, data)
    SELECT bm.user_id, 'pin', 'Message pinned', 'A message was pinned', NEW.message_id, NEW.pinned_by,
           jsonb_build_object('broadcast_id', NEW.broadcast_id, 'message_id', NEW.message_id)
    FROM public.broadcast_members bm
    JOIN public.profiles p ON p.id = bm.user_id
    WHERE bm.broadcast_id = NEW.broadcast_id
      AND bm.user_id != NEW.pinned_by
      AND (p.is_signedin = false OR p.last_seen IS NULL OR p.last_seen < NOW() - INTERVAL '40 seconds');
  END IF;

  RETURN NEW;
END;
$$;

-- 19. Update notify_reaction trigger function to handle broadcasts
CREATE OR REPLACE FUNCTION public.notify_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_owner uuid;
  channel_id uuid;
  dm_id uuid;
  broadcast_id uuid;
  recipient_id uuid;
BEGIN
  -- Try channel message
  SELECT m.user_id, m.channel_id INTO message_owner, channel_id FROM public.messages m WHERE m.id = NEW.message_id;

  -- If not found, try DM message
  IF message_owner IS NULL THEN
    SELECT dmm.user_id, dmm.dm_id INTO message_owner, dm_id FROM public.direct_message_messages dmm WHERE dmm.id = NEW.message_id;
    IF dm_id IS NOT NULL THEN
      SELECT CASE WHEN d.user1_id = NEW.user_id THEN d.user2_id ELSE d.user1_id END
      INTO recipient_id
      FROM public.direct_messages d WHERE d.id = dm_id;
    END IF;
  END IF;

  -- If still not found, try Broadcast message
  IF message_owner IS NULL THEN
    SELECT brm.user_id, brm.broadcast_id INTO message_owner, broadcast_id FROM public.broadcast_messages brm WHERE brm.id = NEW.message_id;
  END IF;

  -- Prevent invalid/self notifications
  IF message_owner IS NULL OR message_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, body, entity_id, actor_id, data)
  SELECT p.id, 'reaction', 'New reaction', NEW.emoji, NEW.message_id, NEW.user_id,
         jsonb_build_object(
           'message_id', NEW.message_id,
           'channel_id', channel_id,
           'dm_id', dm_id,
           'broadcast_id', broadcast_id,
           'recipient_id', recipient_id,
           'emoji', NEW.emoji
         )
  FROM public.profiles p
  WHERE p.id = message_owner
    AND (p.is_signedin = false OR p.last_seen IS NULL OR p.last_seen < NOW() - INTERVAL '40 seconds');

  RETURN NEW;
END;
$$;

-- 20. Add performance index for pinned_messages on broadcast_id
CREATE INDEX IF NOT EXISTS idx_pinned_messages_broadcast_id
  ON public.pinned_messages(broadcast_id)
  WHERE broadcast_id IS NOT NULL;
