CREATE POLICY "authenticated users can insert invites"
ON workspace_invites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "authenticated users can read own invites"
ON workspace_invites
FOR SELECT
TO authenticated
USING (auth.uid() = invited_by);

CREATE POLICY "authenticated users can delete own invites"
ON workspace_invites
FOR DELETE
TO authenticated
USING (auth.uid() = invited_by);