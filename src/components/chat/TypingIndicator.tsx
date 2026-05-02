import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

interface TypingIndicatorProps {
  channelId?: string;
  dmId?: string;
  broadcastId?: string;
}

interface TypingUser {
  user_id: string;
  profiles: {
    full_name: string;
  };
}

export function TypingIndicator({
  channelId,
  dmId,
  broadcastId,
}: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!channelId && !dmId && !broadcastId) return;

    loadTypingUsers();

    const channel = supabase
      .channel(`typing-${channelId || dmId || broadcastId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: channelId
            ? `channel_id=eq.${channelId}`
            : broadcastId
              ? `broadcast_id=eq.${broadcastId}`
              : `dm_id=eq.${dmId}`,
        },
        () => loadTypingUsers(),
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [channelId, dmId, broadcastId]);

  const loadTypingUsers = async () => {
    if (!user) return;

    const threeSecondsAgo = new Date(Date.now() - 3000).toISOString();

    let query = supabase
      .from("typing_indicators")
      .select("user_id, profiles(full_name)")
      .neq("user_id", user.id)
      .gt("started_at", threeSecondsAgo);

    if (channelId) {
      query = query.eq("channel_id", channelId);
    } else if (broadcastId) {
      query = query.eq("broadcast_id", broadcastId);
    } else if (dmId) {
      query = query.eq("dm_id", dmId);
    }

    const { data } = await query;

    if (data) {
      setTypingUsers(data as TypingUser[]);
    } else {
      setTypingUsers([]);
    }
  };

  if (typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.profiles.full_name);
  const text =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing...`
        : `${names[0]} and ${names.length - 1} others are typing...`;

  return (
    <div className="px-6 py-2 text-sm text-slate-600 italic flex items-center gap-2">
      <div className="flex gap-1">
        <span
          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        ></span>
        <span
          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        ></span>
        <span
          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        ></span>
      </div>
      <span>{text}</span>
    </div>
  );
}
