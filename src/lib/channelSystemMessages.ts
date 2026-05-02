export const CHANNEL_SYSTEM_MESSAGE_PREFIX = "__channel_system__:";

export type ChannelSystemMessageType =
  | "member_added"
  | "member_joined"
  | "member_removed"
  | "member_left";

interface ParseChannelSystemMessageOptions {
  isCurrentUser?: boolean;
}

interface ChannelSystemMessagePayload {
  type: ChannelSystemMessageType;
  actorName?: string;
  targetName?: string;
}

export const parseChannelSystemMessage = (
  content: string,
  options?: ParseChannelSystemMessageOptions,
) => {
  if (!content.startsWith(CHANNEL_SYSTEM_MESSAGE_PREFIX)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      content.slice(CHANNEL_SYSTEM_MESSAGE_PREFIX.length),
    ) as ChannelSystemMessagePayload;

    const actorName = payload.actorName?.trim() || "Someone";
    const targetName = payload.targetName?.trim() || "someone";
    const isCurrentUser = options?.isCurrentUser ?? false;

    switch (payload.type) {
      case "member_added":
        return isCurrentUser
          ? `You added ${targetName}`
          : `${actorName} added ${targetName}`;
      case "member_joined":
        return isCurrentUser
          ? "You joined the channel"
          : `${targetName} joined the channel`;
      case "member_removed":
        return isCurrentUser
          ? `You removed ${targetName}`
          : `${actorName} removed ${targetName}`;
      case "member_left":
        return isCurrentUser
          ? "You left the channel"
          : `${targetName} left the channel`;
      default:
        return null;
    }
  } catch {
    return null;
  }
};
