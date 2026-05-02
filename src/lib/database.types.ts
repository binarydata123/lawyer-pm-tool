export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          country_code: string
          phone_no: number | null
          title: string
          avatar_url: string | null
          admin_user_id: string | null
          deleted_by_admin_user_id: string | null
          deleted_from_admin_at: string | null
          status: string
          is_online: boolean
          last_seen: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          country_code?: string
          phone_no?: number | null
          title?: string
          avatar_url?: string | null
          admin_user_id?: string | null
          deleted_by_admin_user_id?: string | null
          deleted_from_admin_at?: string | null
          status?: string
          is_online?: boolean
          last_seen?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          country_code?: string
          phone_no?: number | null
          title?: string
          avatar_url?: string | null
          admin_user_id?: string | null
          deleted_by_admin_user_id?: string | null
          deleted_from_admin_at?: string | null
          status?: string
          is_online?: boolean
          last_seen?: string
          created_at?: string
        }
      }
      admin_user_invites: {
        Row: {
          id: string
          invited_email: string
          invited_by: string
          invited_by_name: string
          workspace_id: string | null
          invite_token: string
          claimed_at: string | null
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          invited_email: string
          invited_by: string
          invited_by_name?: string
          workspace_id?: string | null
          invite_token: string
          claimed_at?: string | null
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          invited_email?: string
          invited_by?: string
          invited_by_name?: string
          workspace_id?: string | null
          invite_token?: string
          claimed_at?: string | null
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          created_by: string | null
          avatar_url: string | null
          is_personal: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_by?: string | null
          avatar_url?: string | null
          is_personal?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_by?: string | null
          avatar_url?: string | null
          is_personal?: boolean
          created_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: string
          invited_by: string | null
          joined_at: string
          removed_at: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: string
          invited_by?: string | null
          joined_at?: string
          removed_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: string
          invited_by?: string | null
          joined_at?: string
          removed_at?: string | null
          is_active?: boolean
        }
      }
      workspace_invites: {
        Row: {
          id: string
          workspace_id: string
          invited_email: string
          invited_by: string
          invited_by_name: string
          workspace_name: string
          role: string
          invite_token: string
          claimed_at: string | null
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          invited_email: string
          invited_by: string
          invited_by_name?: string
          workspace_name?: string
          role?: string
          invite_token: string
          claimed_at?: string | null
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          invited_email?: string
          invited_by?: string
          invited_by_name?: string
          workspace_name?: string
          role?: string
          invite_token?: string
          claimed_at?: string | null
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
      }
      channels: {
        Row: {
          id: string
          name: string
          description: string
          is_private: boolean
          workspace_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          is_private?: boolean
          workspace_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          is_private?: boolean
          workspace_id?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      channel_members: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          role: string
          joined_at: string
          last_read_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          role?: string
          joined_at?: string
          last_read_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          role?: string
          joined_at?: string
          last_read_at?: string
        }
      }
      channel_invites: {
        Row: {
          id: string
          channel_id: string
          workspace_id: string | null
          invited_email: string
          invited_by: string
          invited_by_name: string
          channel_name: string
          invite_token: string
          dm_id: string | null
          claimed_at: string | null
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          workspace_id?: string | null
          invited_email: string
          invited_by: string
          invited_by_name?: string
          channel_name?: string
          invite_token: string
          dm_id?: string | null
          claimed_at?: string | null
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          workspace_id?: string | null
          invited_email?: string
          invited_by?: string
          invited_by_name?: string
          channel_name?: string
          invite_token?: string
          dm_id?: string | null
          claimed_at?: string | null
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
      }
      chat_archives: {
        Row: {
          id: string
          workspace_id: string | null
          user_id: string
          channel_id: string | null
          dm_id: string | null
          archived_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user_id: string
          channel_id?: string | null
          dm_id?: string | null
          archived_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          user_id?: string
          channel_id?: string | null
          dm_id?: string | null
          archived_at?: string
        }
      }
      call_logs: {
        Row: {
          id: string
          workspace_id: string | null
          channel_id: string | null
          dm_id: string | null
          caller_id: string | null
          call_type: string
          started_at: string
          ended_at: string | null
          participant_ids: string[]
          participant_names: Json
          transcript: string | null
          summary: string | null
          summary_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          channel_id?: string | null
          dm_id?: string | null
          caller_id?: string | null
          call_type?: string
          started_at?: string
          ended_at?: string | null
          participant_ids?: string[]
          participant_names?: Json
          transcript?: string | null
          summary?: string | null
          summary_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          channel_id?: string | null
          dm_id?: string | null
          caller_id?: string | null
          call_type?: string
          started_at?: string
          ended_at?: string | null
          participant_ids?: string[]
          participant_names?: Json
          transcript?: string | null
          summary?: string | null
          summary_status?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          channel_id: string | null
          workspace_id: string | null
          user_id: string
          content: string
          parent_id: string | null
          created_at: string
          updated_at: string
          is_edited: boolean
          attachment_url: string | null
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          status: string | null
          thread_id: string | null
          reply_count: number | null
          is_pinned: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          forwarded: boolean | null
          is_deleted: boolean | null
        }
        Insert: {
          id?: string
          channel_id?: string | null
          workspace_id?: string | null
          user_id: string
          content: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
          is_edited?: boolean
          attachment_url?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          status?: string | null
          thread_id?: string | null
          reply_count?: number | null
          is_pinned?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          forwarded?: boolean | null
          is_deleted?: boolean | null
        }
        Update: {
          id?: string
          channel_id?: string | null
          workspace_id?: string | null
          user_id?: string
          content?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
          is_edited?: boolean
          attachment_url?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          status?: string | null
          thread_id?: string | null
          reply_count?: number | null
          is_pinned?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          forwarded?: boolean | null
          is_deleted?: boolean | null
        }
      }
      direct_messages: {
        Row: {
          id: string
          workspace_id: string | null
          user1_id: string
          user2_id: string
          user1_last_read_at: string
          user2_last_read_at: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user1_id: string
          user2_id: string
          user1_last_read_at?: string
          user2_last_read_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          user1_id?: string
          user2_id?: string
          user1_last_read_at?: string
          user2_last_read_at?: string
          created_at?: string
        }
      }
      direct_message_messages: {
        Row: {
          id: string
          dm_id: string
          workspace_id: string | null
          user_id: string
          content: string
          created_at: string
          updated_at: string
          is_edited: boolean
          is_read: boolean
          attachment_url: string | null
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          status: string | null
          parent_id: string | null
          thread_id: string | null
          reply_count: number | null
          is_pinned: boolean | null
          deleted_at: string | null
          deleted_by: string | null
          forwarded: boolean | null
          is_deleted: boolean | null
        }
        Insert: {
          id?: string
          dm_id: string
          workspace_id?: string | null
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
          is_edited?: boolean
          is_read?: boolean
          attachment_url?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          status?: string | null
          parent_id?: string | null
          thread_id?: string | null
          reply_count?: number | null
          is_pinned?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          forwarded?: boolean | null
          is_deleted?: boolean | null
        }
        Update: {
          id?: string
          dm_id?: string
          workspace_id?: string | null
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
          is_edited?: boolean
          is_read?: boolean
          attachment_url?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          status?: string | null
          parent_id?: string | null
          thread_id?: string | null
          reply_count?: number | null
          is_pinned?: boolean | null
          deleted_at?: string | null
          deleted_by?: string | null
          forwarded?: boolean | null
          is_deleted?: boolean | null
        }
      }
      message_hidden_for_users: {
        Row: {
          id: string
          message_id: string
          user_id: string
          source_table: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          source_table: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          source_table?: string
          created_at?: string
        }
      }
      files: {
        Row: {
          id: string
          name: string
          size: number
          mime_type: string
          storage_path: string
          uploaded_by: string
          workspace_id: string | null
          channel_id: string | null
          message_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          size: number
          mime_type: string
          storage_path: string
          uploaded_by: string
          workspace_id?: string | null
          channel_id?: string | null
          message_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          size?: number
          mime_type?: string
          storage_path?: string
          uploaded_by?: string
          workspace_id?: string | null
          channel_id?: string | null
          message_id?: string | null
          created_at?: string
        }
      }
      typing_indicators: {
        Row: {
          id: string
          workspace_id: string | null
          channel_id: string | null
          dm_id: string | null
          user_id: string
          started_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          channel_id?: string | null
          dm_id?: string | null
          user_id: string
          started_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          channel_id?: string | null
          dm_id?: string | null
          user_id?: string
          started_at?: string
        }
      }
    }
  }
}
