import { MainAppMessage } from "../pages/main-app/types";
import {
  parseChannelInviteMessageContent,
  type InviteMessagePayload,
} from "./channelInvites";
import { parseChannelSystemMessage } from "./channelSystemMessages";
import { supabase } from "./supabase";

export type NotificationKind = "message" | "reply" | "reaction" | "pin";

export interface NotificationSelection {
  channelId?: string;
  dmId?: string;
  recipientId?: string;
  messageId?: string;
  timestamp?: string;
  message?: MainAppMessage | null;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: {
    channel_id?: string;
    dm_id?: string;
    recipient_id?: string;
    message_id?: string;
    thread_id?: string;
    is_reply?: boolean;
    emoji?: string;
    attachment_url?: string | null;
    attachment_type?: string | null;
    [key: string]: unknown;
  };
  entity_id: string | null;
  actor: {
    avatar_color: string;
    full_name: string;
    email: string;
  };
  is_read: boolean;
  created_at: string;
  channel?: {
    id: string;
    name: string;
    is_private: boolean;
  };
}

export type NotificationBodyPreview =
  | {
      kind: "system";
      text: string;
    }
  | {
      kind: "invite";
      text: string;
      invite: InviteMessagePayload;
    }
  | {
      kind: "plain";
      text: string;
    };

export const getNotificationKind = (notification: NotificationRecord) => {
  if (notification.type === "reaction") return "reaction";
  if (notification.type === "pin") return "pin";
  if (notification.type === "message" && notification.data?.is_reply) {
    return "reply";
  }

  return "message";
};

export const getNotificationBodyPreview = (
  notification: NotificationRecord,
): NotificationBodyPreview => {
  const systemMessage = parseChannelSystemMessage(notification.body);
  if (systemMessage) {
    return {
      kind: "system",
      text: systemMessage,
    };
  }

  const inviteMessage = parseChannelInviteMessageContent(notification.body);
  if (inviteMessage) {
    return {
      kind: "invite",
      text: `${inviteMessage.invitedByName} invited you to join #${inviteMessage.channelName}.`,
      invite: inviteMessage,
    };
  }

  return {
    kind: "plain",
    text: notification.body,
  };
};

export const loadNotificationsForUser = async (
  userId: string,
  workspaceId?: string | null,
) => {
  const { data: notifs, error } = await supabase
    .from("notifications")
    .select(
      `
        id, user_id, type, title, body, data, entity_id, is_read, created_at,
        actor:profiles!notifications_actor_id_fkey (avatar_color, full_name, email)
      `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const channelIds = (notifs ?? [])
    .map((notification: NotificationRecord) => notification?.data?.channel_id)
    .filter(Boolean) as string[];

  let channelsMap: Record<string, NotificationRecord["channel"]> = {};

  if (channelIds.length > 0) {
    let channelsQuery = supabase
      .from("channels")
      .select("id, name, is_private")
      .in("id", channelIds);

    if (workspaceId) {
      channelsQuery = channelsQuery.eq("workspace_id", workspaceId);
    }

    const { data: channels, error: channelsError } = await channelsQuery;

    if (channelsError) throw channelsError;

    channels?.forEach(
      (channel: { id: string; name: string; is_private: boolean }) => {
        channelsMap[channel.id] = channel;
      },
    );
  }

  return (notifs ?? []).map((notification: NotificationRecord) => ({
    ...notification,
    channel: channelsMap[notification.data?.channel_id || ""],
  })) as NotificationRecord[];
};
