import { supabase } from './supabase';
import type { Database } from './database.types';

type Tables = Database['public']['Tables'];

export const db = {
  profiles: () => supabase.from('profiles'),
  channels: () => supabase.from('channels'),
  channel_members: () => supabase.from('channel_members'),
  messages: () => supabase.from('messages'),
  direct_messages: () => supabase.from('direct_messages'),
  direct_message_messages: () => supabase.from('direct_message_messages'),
  files: () => supabase.from('files'),
  typing_indicators: () => supabase.from('typing_indicators'),
};

export type Profile = Tables['profiles']['Row'];
export type Channel = Tables['channels']['Row'];
export type ChannelMember = Tables['channel_members']['Row'];
export type Message = Tables['messages']['Row'];
export type DirectMessage = Tables['direct_messages']['Row'];
export type DirectMessageMessage = Tables['direct_message_messages']['Row'];
export type FileRecord = Tables['files']['Row'];
export type TypingIndicator = Tables['typing_indicators']['Row'];
