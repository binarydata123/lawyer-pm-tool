-- 1. Drop the legacy INSERT policy
DROP POLICY IF EXISTS "Workspace DM participants can create messages" ON public.direct_message_messages;

-- 2. Create the new INSERT policy only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'direct_message_messages' 
        AND policyname = 'Users can create messages in their DMs'
    ) THEN
        CREATE POLICY "Users can create messages in their DMs"
        ON public.direct_message_messages
        FOR INSERT
        TO authenticated
        WITH CHECK (
          auth.uid() = user_id AND EXISTS (
            SELECT 1 FROM direct_messages
            WHERE direct_messages.id = direct_message_messages.dm_id
            AND (direct_messages.user1_id = auth.uid() OR direct_messages.user2_id = auth.uid())
          )
        );
    END IF;
END $$;

-- 3. Drop the legacy SELECT policy
DROP POLICY IF EXISTS "Workspace DM participants can view messages" ON public.direct_message_messages;

-- 4. Create the new SELECT policy only if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'direct_message_messages' 
        AND policyname = 'Users can view messages in their DMs'
    ) THEN
        CREATE POLICY "Users can view messages in their DMs"
        ON public.direct_message_messages
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM direct_messages
            WHERE direct_messages.id = direct_message_messages.dm_id
            AND (direct_messages.user1_id = auth.uid() OR direct_messages.user2_id = auth.uid())
          )
        );
    END IF;
END $$;