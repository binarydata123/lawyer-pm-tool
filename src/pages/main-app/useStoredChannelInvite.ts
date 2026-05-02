import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import {
  clearStoredInviteLinkContext,
  createChannelInviteMessageContent,
  getStoredInviteLinkContext,
} from "../../lib/channelInvites";
import { supabase } from "../../lib/supabase";
import type { ChannelInviteRecord } from "./types";

interface UseStoredChannelInviteOptions {
  user: User | null;
  setInviteError: (value: string | null) => void;
  setSelectedDMId: (value: string | undefined) => void;
  setOtherUserId: (value: string | undefined) => void;
  setSelectedChannelId: (value: string | undefined) => void;
  updateUrl: (params: Record<string, string | undefined>) => void;
}

export function useStoredChannelInvite({
  user,
  setInviteError,
  setSelectedDMId,
  setOtherUserId,
  setSelectedChannelId,
  updateUrl,
}: UseStoredChannelInviteOptions) {
  const processingInviteTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const processStoredInvite = async () => {
      const storedInvite = getStoredInviteLinkContext();
      if (!storedInvite?.token) return;
      if (processingInviteTokenRef.current === storedInvite.token) return;

      processingInviteTokenRef.current = storedInvite.token;

      try {
        setInviteError(null);

        const { data: invite, error } = await supabase
          .from("channel_invites")
          .select(
            "channel_id, workspace_id, invited_email, invited_by, invited_by_name, channel_name, invite_token, dm_id, claimed_at, accepted_at",
          )
          .eq("invite_token", storedInvite.token)
          .maybeSingle();

        const typedInvite = invite as ChannelInviteRecord | null;

        if (!isMounted) return;

        if (error) {
          setInviteError(error.message);
          return;
        }

        if (!typedInvite) {
          setInviteError("This invite link is no longer valid.");
          clearStoredInviteLinkContext();
          return;
        }

        if (
          typedInvite.invited_email &&
          user.email &&
          typedInvite.invited_email.toLowerCase() !== user.email.toLowerCase()
        ) {
          setInviteError(
            `This invite was sent to ${typedInvite.invited_email}. Sign in with that email to continue.`,
          );
          return;
        }

        const [userId1, userId2] = [user.id, typedInvite.invited_by].sort();

        const { data: existingDM, error: existingDMError } = await supabase
          .from("direct_messages")
          .select("id")
          .eq("workspace_id", (typedInvite as any).workspace_id)
          .eq("user1_id", userId1)
          .eq("user2_id", userId2)
          .maybeSingle();

        if (existingDMError) {
          setInviteError(existingDMError.message);
          return;
        }

        let dmId = (existingDM as { id: string } | null)?.id;

        if (!dmId) {
          const { data: createdDM, error: createDMError } = await supabase
            .from("direct_messages")
            .insert({
              workspace_id: (typedInvite as any).workspace_id,
              user1_id: userId1,
              user2_id: userId2,
            } as never)
            .select("id")
            .single();

          if (createDMError) {
            if (createDMError.code === "23505") {
              const { data: duplicateDM, error: duplicateDMError } =
                await supabase
                  .from("direct_messages")
                  .select("id")
                  .eq("workspace_id", (typedInvite as any).workspace_id)
                  .eq("user1_id", userId1)
                  .eq("user2_id", userId2)
                  .maybeSingle();

              if (duplicateDMError) {
                setInviteError(duplicateDMError.message);
                return;
              }

              dmId = (duplicateDM as { id: string } | null)?.id;
            } else {
              setInviteError(createDMError.message);
              return;
            }
          } else {
            dmId = (createdDM as { id: string }).id;
          }
        }

        if (!dmId) {
          setInviteError("Failed to create or load the invite chat.");
          return;
        }

        const inviteMessageContent = createChannelInviteMessageContent({
          token: typedInvite.invite_token,
          channelId: typedInvite.channel_id,
          channelName: typedInvite.channel_name,
          invitedByName: typedInvite.invited_by_name,
          invitedById: typedInvite.invited_by,
        });

        const { data: existingInviteMessage, error: inviteMessageError } =
          await supabase
            .from("direct_message_messages")
            .select("id")
            .eq("dm_id", dmId)
            .eq("content", inviteMessageContent)
            .maybeSingle();

        if (inviteMessageError) {
          setInviteError(inviteMessageError.message);
          return;
        }

        if (!existingInviteMessage) {
          const { error: messageInsertError } = await supabase
            .from("direct_message_messages")
            .insert({
              dm_id: dmId,
              user_id: user.id,
              content: inviteMessageContent,
            } as never);

          if (messageInsertError) {
            setInviteError(messageInsertError.message);
            return;
          }
        }

        const { error: updateInviteError } = await (supabase as any)
          .from("channel_invites")
          .update({
            dm_id: dmId,
            claimed_at: typedInvite.claimed_at || new Date().toISOString(),
          })
          .eq("invite_token", typedInvite.invite_token);

        if (updateInviteError) {
          console.error(
            "Failed to update invite claim state",
            updateInviteError,
          );
        }

        setSelectedDMId(dmId);
        setOtherUserId(typedInvite.invited_by);
        setSelectedChannelId(undefined);
        updateUrl({ dm: dmId, user: typedInvite.invited_by });
        clearStoredInviteLinkContext();
      } finally {
        processingInviteTokenRef.current = null;
      }
    };

    void processStoredInvite();

    return () => {
      isMounted = false;
      processingInviteTokenRef.current = null;
    };
  }, [
    setInviteError,
    setOtherUserId,
    setSelectedChannelId,
    setSelectedDMId,
    updateUrl,
    user,
  ]);
}
