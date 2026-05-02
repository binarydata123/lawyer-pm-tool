-- =========================
-- DROP NEW DB POLICIES (if exist)
-- =========================

DROP POLICY IF EXISTS "Workspace channel members can create messages"
ON public.messages;

DROP POLICY IF EXISTS "Workspace channel members can view messages"
ON public.messages;


-- =========================
-- CREATE OLD DB POLICIES (only if not exist)
-- =========================

DO $$
BEGIN

-- INSERT policy
IF NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'messages'
    AND policyname = 'Users can create messages in their channels'
) THEN
  CREATE POLICY "Users can create messages in their channels"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id)
    AND EXISTS (
      SELECT 1
      FROM channel_members
      WHERE channel_members.channel_id = messages.channel_id
      AND channel_members.user_id = auth.uid()
    )
  );
END IF;

-- SELECT policy
IF NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'messages'
    AND policyname = 'Users can view messages in their channels'
) THEN
  CREATE POLICY "Users can view messages in their channels"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM channel_members
      WHERE channel_members.channel_id = messages.channel_id
      AND channel_members.user_id = auth.uid()
    )
  );
END IF;

END $$;