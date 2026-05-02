/*
  # Call history

  Stores call metadata, participants, transcript text, and generated summaries
  for channel and direct-message calls.
*/

CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  dm_id uuid REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  caller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  call_type text NOT NULL DEFAULT 'audio',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  participant_names jsonb NOT NULL DEFAULT '{}'::jsonb,
  transcript text,
  summary text,
  summary_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT call_logs_single_room CHECK (
    (channel_id IS NOT NULL AND dm_id IS NULL) OR
    (channel_id IS NULL AND dm_id IS NOT NULL)
  ),
  CONSTRAINT call_logs_call_type_check CHECK (
    call_type IN ('audio', 'video', 'screen')
  ),
  CONSTRAINT call_logs_summary_status_check CHECK (
    summary_status IN ('pending', 'skipped', 'generated', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_call_logs_channel_started
  ON public.call_logs(channel_id, started_at DESC)
  WHERE channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_logs_dm_started
  ON public.call_logs(dm_id, started_at DESC)
  WHERE dm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_call_logs_workspace_started
  ON public.call_logs(workspace_id, started_at DESC);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view call logs in their channels"
  ON public.call_logs FOR SELECT
  TO authenticated
  USING (
    (
      channel_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.channel_members
        WHERE channel_members.channel_id = call_logs.channel_id
        AND channel_members.user_id = auth.uid()
      )
    ) OR (
      dm_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.direct_messages
        WHERE direct_messages.id = call_logs.dm_id
        AND (
          direct_messages.user1_id = auth.uid() OR
          direct_messages.user2_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create call logs in their rooms"
  ON public.call_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = caller_id AND
    (
      (
        channel_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.channel_members
          WHERE channel_members.channel_id = call_logs.channel_id
          AND channel_members.user_id = auth.uid()
        )
      ) OR (
        dm_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.direct_messages
          WHERE direct_messages.id = call_logs.dm_id
          AND (
            direct_messages.user1_id = auth.uid() OR
            direct_messages.user2_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Call creators can update call logs"
  ON public.call_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = caller_id)
  WITH CHECK (auth.uid() = caller_id);

CREATE OR REPLACE FUNCTION public.set_call_logs_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_call_logs_updated_at ON public.call_logs;
CREATE TRIGGER set_call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_call_logs_updated_at();
