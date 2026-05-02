export interface MainAppMessage {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  user_id: string;
  workspace_id?: string | null;
  channel_id?: string | null;
  dm_id?: string | null;
  parent_id?: string | null;
  thread_id?: string | null;
  reply_count?: number | null;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachment_type?: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
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
  invited_email: string;
  invited_by: string;
  invited_by_name: string;
  channel_name: string;
  invite_token: string;
  dm_id: string | null;
  claimed_at: string | null;
  accepted_at: string | null;
}
