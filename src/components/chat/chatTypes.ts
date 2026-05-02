import type { MouseEvent as ReactMouseEvent } from "react";

export interface ChatMessageProfile {
  full_name: string;
  avatar_url: string | null;
  avatar_color?: string | null;
}

export interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  user_id: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachment_type?: string;
  parent_id?: string | null;
  thread_id?: string | null;
  reply_count?: number | null;
  is_pinned?: boolean;
  channel_id?: string | null;
  broadcast_id?: string | null;
  dm_id?: string | null;
  workspace_id?: string | null;
  profiles?: ChatMessageProfile;
  forwarded?: boolean;
  reply_preview?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    attachmentName?: string | null;
  } | null;
}

export interface ChannelInviteRecord {
  channel_id: string;
  workspace_id?: string;
  invited_email: string;
  accepted_at: string | null;
}

export interface MessageListProps {
  channelId?: string;
  broadcastId?: string;
  dmId?: string;
  messageSentToken?: number;
  onThreadOpen?: (message: ChatMessage) => void;
  onReplyToMessage?: (message: ChatMessage) => void;
  onForwardMessage?: (message: ChatMessage) => void;
  onForwardMessages?: (messages: ChatMessage[]) => void;
  onChannelJoin?: (channelId: string) => void;
  onDMSelect?: (
    userId: string,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => void;
  onMentionClick?: (
    mentionName: string,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => void;
  scrollToMessageTarget?: {
    messageId: string;
    nonce: number;
    timestamp?: string;
  } | null;
}

export interface MentionOption {
  id: string;
  name: string;
}

export interface MentionMatch {
  start: number;
  end: number;
  query: string;
}

export interface MessageInputProps {
  channelId?: string;
  broadcastId?: string;
  dmId?: string;
  focusToken?: number;
  replyTarget?: ChatMessage | null;
  onCancelReply?: () => void;
  onMessageSent?: () => void;
}

export interface ChatDetailsPanelProps {
  channelId?: string;
  broadcastId?: string;
  dmId?: string;
  otherUserId?: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onMemberClick?: (
    member: import("./MemberPopup").MemberPopupProfile,
    position: import("./MemberPopup").MemberPopupPosition,
  ) => void;
  onBookmarkClick?: (messageId: string) => void;
  onMembersClick?: () => void;
  onPinnedClick?: () => void;
  onSettingsClick?: () => void;
  onPinnedMessageClick?: (messageId: string) => void;
  onChannelLeft?: () => void;
  onEditChat?: () => void;
  onDeleteChat?: () => void;
}

export interface ProfileInfo {
  full_name: string;
  email: string;
  is_signedin: boolean;
  last_seen: string;
  avatar_url?: string | null;
}

export interface ChannelInfo {
  name: string;
  description: string;
  is_private: boolean;
  member_count?: number;
  current_user_role?: string | null;
}

export interface BroadcastInfo {
  name: string;
  created_by: string | null;
  member_count?: number;
}

export interface ChatAssetMessage {
  id: string;
  content: string;
  created_at: string;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachment_type?: string;
}

export interface BookmarkedItemMessage {
  id: string;
  content: string;
  created_at: string;
  channel_id?: string | null;
  broadcast_id?: string | null;
  dm_id?: string | null;
  workspace_id?: string | null;
  channels?: {
    name: string;
  } | null;
}

export interface BookmarkedItem {
  id: string;
  message_id: string;
  created_at: string;
  note: string | null;
  message?: BookmarkedItemMessage;
}

export type MessageTodoStatus = "pending" | "done";

export interface MessageTodoItem {
  id: string;
  message_id: string;
  message_source: "channel" | "dm" | "broadcast";
  user_id: string;
  status: MessageTodoStatus;
  completed_by?: string | null;
  completed_at?: string | null;
  created_at: string;
  message?: BookmarkedItemMessage;
  creator?: {
    full_name: string;
  } | null;
  completer?: {
    full_name: string;
  } | null;
}

export interface ChannelMemberProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  avatar_color?: string | null;
  is_signedin: boolean;
  last_seen: string;
}

export interface ChannelMemberEntry {
  id: string;
  role: string;
  joined_at: string;
  profiles: ChannelMemberProfile | null;
}

export type PanelSectionKey =
  | "members"
  | "urls"
  | "media"
  | "scheduled"
  | "bookmarks"
  | "credentials"
  | "notes"
  | "pins"
  | "todo";
