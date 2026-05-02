-- CHANNELS POLICIES

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channels'
      AND policyname = 'Allow channel creator to delete'
  ) THEN
    CREATE POLICY "Allow channel creator to delete"
    ON public.channels
    FOR DELETE
    TO public
    USING (auth.uid() = created_by);
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channels'
      AND policyname = 'Channel creators can update their channels'
  ) THEN
    CREATE POLICY "Channel creators can update their channels"
    ON public.channels
    FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channels'
      AND policyname = 'Users can create channels'
  ) THEN
    CREATE POLICY "Users can create channels"
    ON public.channels
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = created_by
      AND EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
        AND p.admin_user_id IS NULL
      )
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channels'
      AND policyname = 'Users can view channels they are members of'
  ) THEN
    CREATE POLICY "Users can view channels they are members of"
    ON public.channels
    FOR SELECT
    TO authenticated
    USING (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM channel_members cm
        WHERE cm.channel_id = channels.id
        AND cm.user_id = auth.uid()
      )
      OR (
        NOT is_private
        AND EXISTS (
          SELECT 1
          FROM profiles viewer
          WHERE viewer.id = auth.uid()
          AND viewer.admin_user_id = channels.created_by
        )
      )
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channels'
      AND policyname = 'Users can view channels where they are members'
  ) THEN
    CREATE POLICY "Users can view channels where they are members"
    ON public.channels
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM channel_members
        WHERE channel_members.channel_id = channels.id
        AND channel_members.user_id = auth.uid()
      )
    );
  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'channels'
      AND policyname = 'Users can view public channels or their own channels'
  ) THEN
    CREATE POLICY "Users can view public channels or their own channels"
    ON public.channels
    FOR SELECT
    TO authenticated
    USING (
      NOT is_private
      OR created_by = auth.uid()
    );
  END IF;
END $$;