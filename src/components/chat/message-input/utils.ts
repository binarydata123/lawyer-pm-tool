import { supabase } from "../../../lib/supabase";
import type { MentionMatch, MentionOption } from "../chatTypes";

export const MAX_ATTACHMENTS = 20;

export const getMentionMatch = (value: string, cursorPosition: number) => {
  const beforeCursor = value.slice(0, cursorPosition);
  const match = beforeCursor.match(/(^|\s)@([^\s\]]*)$/);

  if (!match) return null;

  const token = match[0];
  const query = match[2] || "";

  return {
    start: cursorPosition - token.length + (token.startsWith(" ") ? 1 : 0),
    end: cursorPosition,
    query,
  } satisfies MentionMatch;
};

export const filterMentionOptions = (
  mentionOptions: MentionOption[],
  mentionMatch: MentionMatch | null,
) => {
  if (!mentionMatch) return [];

  return mentionOptions.filter((option) =>
    option.name.toLowerCase().includes(mentionMatch.query.toLowerCase()),
  );
};

export const loadMentionOptions = async ({
  userId,
  channelId,
  broadcastId,
  dmId,
}: {
  userId?: string;
  channelId?: string;
  broadcastId?: string;
  dmId?: string;
}) => {
  if (!userId || (!channelId && !broadcastId && !dmId)) return [];

  if (channelId || broadcastId) {
    const table = channelId ? "channel_members" : "broadcast_members";
    const column = channelId ? "channel_id" : "broadcast_id";

    const { data, error } = await (supabase as any)
      .from(table)
      .select("user_id, profiles(id, full_name)")
      .eq(column, channelId || broadcastId);

    if (error) {
      console.error(
        `Failed to load ${channelId ? "channel" : "broadcast"} mention options`,
        error,
      );
      return [];
    }

    return ((data as any[]) || [])
      .map((member) => member.profiles)
      .filter(
        (profile): profile is { id: string; full_name: string } =>
          !!profile && profile.id !== userId,
      )
      .map((profile) => ({
        id: profile.id,
        name: profile.full_name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const { data: dm, error: dmError } = await (supabase as any)
    .from("direct_messages")
    .select("id, user1_id, user2_id")
    .eq("id", dmId)
    .maybeSingle();

  if (dmError || !dm) {
    if (dmError) {
      console.error("Failed to load DM mention options", dmError);
    }
    return [];
  }

  const otherUserId = dm.user1_id === userId ? dm.user2_id : dm.user1_id;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", otherUserId)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load DM mention profile", profileError);
    return [];
  }

  return profile
    ? [{ id: (profile as any).id, name: (profile as any).full_name }]
    : [];
};
