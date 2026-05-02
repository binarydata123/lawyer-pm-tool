import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";

interface UseTypingIndicatorOptions {
  userId?: string;
  channelId?: string;
  broadcastId?: string;
  dmId?: string;
  workspaceId?: string | null;
}

export function useTypingIndicator({
  userId,
  channelId,
  broadcastId,
  dmId,
  workspaceId,
}: UseTypingIndicatorOptions) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const clearTypingIndicator = async () => {
    if (!userId || (!channelId && !broadcastId && !dmId)) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }

    setIsTyping(false);

    const conversationColumn = channelId
      ? "channel_id"
      : broadcastId
        ? "broadcast_id"
        : "dm_id";
    const conversationId = channelId || broadcastId || dmId;

    await supabase
      .from("typing_indicators")
      .delete()
      .eq("user_id", userId)
      .eq(conversationColumn, conversationId as string);
  };

  const handleTyping = async () => {
    if (!userId) return;

    if (!isTyping) {
      setIsTyping(true);
      const conversationColumn = channelId
        ? "channel_id"
        : broadcastId
          ? "broadcast_id"
          : "dm_id";
      const conversationId = channelId || broadcastId || dmId;

      await supabase
        .from("typing_indicators")
        .delete()
        .eq("user_id", userId)
        .eq(conversationColumn, conversationId as string);

      await supabase.from("typing_indicators").insert({
        channel_id: channelId || null,
        dm_id: dmId || null,
        broadcast_id: broadcastId || null,
        workspace_id: workspaceId || null,
        user_id: userId,
        started_at: new Date().toISOString(),
      } as any);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(async () => {
      await clearTypingIndicator();
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      const conversationId = channelId || broadcastId || dmId;
      if (userId && conversationId) {
        const conversationColumn = channelId
          ? "channel_id"
          : broadcastId
            ? "broadcast_id"
            : "dm_id";
        void supabase
          .from("typing_indicators")
          .delete()
          .eq("user_id", userId)
          .eq(conversationColumn, conversationId);
      }
    };
  }, [channelId, dmId, broadcastId, userId]);

  return {
    clearTypingIndicator,
    handleTyping,
  };
}
