create extension if not exists "pg_trgm" with schema "public";


  create table "public"."admin_user_invites" (
    "id" uuid not null default gen_random_uuid(),
    "invited_email" text not null,
    "invited_by" uuid not null,
    "invited_by_name" text not null default ''::text,
    "invite_token" text not null,
    "claimed_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone not null default (now() + '14 days'::interval),
    "created_at" timestamp with time zone not null default now(),
    "workspace_id" uuid
      );


alter table "public"."admin_user_invites" enable row level security;


  create table "public"."broadcast_members" (
    "broadcast_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'member'::text,
    "joined_at" timestamp with time zone not null default now(),
    "last_read_at" timestamp with time zone not null default now()
      );


alter table "public"."broadcast_members" enable row level security;


  create table "public"."broadcast_messages" (
    "id" uuid not null default gen_random_uuid(),
    "broadcast_id" uuid not null,
    "user_id" uuid,
    "content" text,
    "attachment_url" text,
    "attachment_name" text,
    "attachment_type" text,
    "attachment_size" bigint,
    "created_at" timestamp with time zone not null default now(),
    "is_deleted" boolean not null default false,
    "deleted_by" uuid,
    "deleted_at" timestamp with time zone,
    "is_edited" boolean not null default false,
    "updated_at" timestamp with time zone not null default now(),
    "workspace_id" uuid not null
      );


alter table "public"."broadcast_messages" enable row level security;


  create table "public"."broadcasts" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "workspace_id" uuid not null,
    "created_by" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."broadcasts" enable row level security;


  create table "public"."channel_hidden_memberships" (
    "channel_id" uuid not null,
    "user_id" uuid not null,
    "hidden_at" timestamp with time zone not null default now()
      );


alter table "public"."channel_hidden_memberships" enable row level security;


  create table "public"."channel_invites" (
    "id" uuid not null default gen_random_uuid(),
    "channel_id" uuid not null,
    "invited_email" text not null,
    "invited_by" uuid not null,
    "invited_by_name" text not null default ''::text,
    "channel_name" text not null default ''::text,
    "invite_token" text not null,
    "dm_id" uuid,
    "claimed_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone not null default (now() + '14 days'::interval),
    "created_at" timestamp with time zone not null default now(),
    "workspace_id" uuid
      );


alter table "public"."channel_invites" enable row level security;


  create table "public"."channel_members" (
    "id" uuid not null default gen_random_uuid(),
    "channel_id" uuid not null,
    "user_id" uuid not null,
    "role" text default 'member'::text,
    "joined_at" timestamp with time zone default now(),
    "last_read_at" timestamp with time zone default now()
      );


alter table "public"."channel_members" enable row level security;


  create table "public"."channels" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text default ''::text,
    "is_private" boolean default false,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "workspace_id" uuid
      );


alter table "public"."channels" enable row level security;


  create table "public"."chat_archives" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid,
    "user_id" uuid not null,
    "channel_id" uuid,
    "dm_id" uuid,
    "archived_at" timestamp with time zone not null default now(),
    "broadcast_id" uuid
      );


alter table "public"."chat_archives" enable row level security;


  create table "public"."chat_detail_entries" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "channel_id" uuid,
    "dm_id" uuid,
    "credentials" text default ''::text,
    "personal_notes" text default ''::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."chat_detail_entries" enable row level security;


  create table "public"."direct_message_messages" (
    "id" uuid not null default gen_random_uuid(),
    "dm_id" uuid not null,
    "user_id" uuid not null,
    "content" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_edited" boolean default false,
    "is_read" boolean default false,
    "attachment_url" text,
    "attachment_name" text,
    "attachment_size" integer,
    "attachment_type" text,
    "status" text default 'sent'::text,
    "thread_id" uuid,
    "reply_count" integer default 0,
    "is_pinned" boolean default false,
    "deleted_at" timestamp with time zone,
    "deleted_by" uuid,
    "is_deleted" boolean default false,
    "workspace_id" uuid,
    "broadcast_message_id" uuid
      );


alter table "public"."direct_message_messages" enable row level security;


  create table "public"."direct_messages" (
    "id" uuid not null default gen_random_uuid(),
    "user1_id" uuid not null,
    "user2_id" uuid not null,
    "created_at" timestamp with time zone default now(),
    "user1_last_read_at" timestamp with time zone default now(),
    "user2_last_read_at" timestamp with time zone default now(),
    "workspace_id" uuid
      );


alter table "public"."direct_messages" enable row level security;


  create table "public"."files" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "size" bigint not null,
    "mime_type" text not null,
    "storage_path" text not null,
    "uploaded_by" uuid not null,
    "channel_id" uuid,
    "message_id" uuid,
    "created_at" timestamp with time zone default now(),
    "workspace_id" uuid
      );


alter table "public"."files" enable row level security;


  create table "public"."message_bookmarks" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" uuid not null,
    "user_id" uuid not null,
    "note" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."message_bookmarks" enable row level security;


  create table "public"."message_forwards" (
    "id" uuid not null default gen_random_uuid(),
    "original_message_id" uuid not null,
    "new_message_id" uuid not null,
    "forwarded_by" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."message_forwards" enable row level security;


  create table "public"."message_hidden_for_users" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" uuid not null,
    "user_id" uuid not null,
    "source_table" text not null,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."message_mentions" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" uuid not null,
    "mentioned_user_id" uuid,
    "mention_type" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."message_mentions" enable row level security;


  create table "public"."message_reactions" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" uuid not null,
    "user_id" uuid not null,
    "emoji" text not null,
    "created_at" timestamp with time zone default now(),
    "channel_id" uuid,
    "dm_id" uuid,
    "workspace_id" uuid,
    "broadcast_id" uuid
      );


alter table "public"."message_reactions" enable row level security;


  create table "public"."message_read_receipts" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" uuid not null,
    "user_id" uuid not null,
    "read_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now()
      );


alter table "public"."message_read_receipts" enable row level security;


  create table "public"."message_todos" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" uuid not null,
    "message_source" text not null,
    "channel_id" uuid,
    "dm_id" uuid,
    "workspace_id" uuid,
    "user_id" uuid not null,
    "status" text not null default 'pending'::text,
    "completed_by" uuid,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "broadcast_id" uuid
      );


alter table "public"."message_todos" enable row level security;


  create table "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "channel_id" uuid,
    "user_id" uuid not null,
    "content" text not null,
    "parent_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_edited" boolean default false,
    "attachment_url" text,
    "attachment_name" text,
    "attachment_size" integer,
    "attachment_type" text,
    "status" text default 'sent'::text,
    "thread_id" uuid,
    "reply_count" integer default 0,
    "is_pinned" boolean default false,
    "deleted_at" timestamp with time zone,
    "deleted_by" uuid,
    "is_deleted" boolean default false,
    "workspace_id" uuid
      );


alter table "public"."messages" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "actor_id" uuid,
    "entity_id" uuid,
    "type" text not null,
    "title" text,
    "body" text,
    "data" jsonb,
    "is_read" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."pinned_messages" (
    "id" uuid not null default gen_random_uuid(),
    "message_id" uuid not null,
    "channel_id" uuid,
    "dm_id" uuid,
    "pinned_by" uuid not null,
    "created_at" timestamp with time zone default now(),
    "broadcast_id" uuid
      );


alter table "public"."pinned_messages" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text not null,
    "full_name" text not null,
    "avatar_url" text,
    "avatar_color" text,
    "status" text default ''::text,
    "is_online" boolean default false,
    "last_seen" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "admin_user_id" uuid,
    "deleted_by_admin_user_id" uuid,
    "deleted_from_admin_at" timestamp with time zone,
    "is_signedin" boolean default false
      );


alter table "public"."profiles" enable row level security;


  create table "public"."push_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "endpoint" text not null,
    "p256dh" text not null,
    "auth" text not null,
    "device_id" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."push_subscriptions" enable row level security;


  create table "public"."signup_trigger_errors" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "email" text,
    "error_message" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."signup_trigger_errors" enable row level security;


  create table "public"."typing_indicators" (
    "id" uuid not null default gen_random_uuid(),
    "channel_id" uuid,
    "dm_id" uuid,
    "user_id" uuid not null,
    "started_at" timestamp with time zone default now(),
    "workspace_id" uuid,
    "broadcast_id" uuid
      );


alter table "public"."typing_indicators" enable row level security;


  create table "public"."workspace_invites" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "invited_email" text not null,
    "invited_by" uuid not null,
    "invited_by_name" text not null default ''::text,
    "workspace_name" text not null default ''::text,
    "role" text not null default 'member'::text,
    "invite_token" text not null,
    "claimed_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "expires_at" timestamp with time zone not null default (now() + '14 days'::interval),
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."workspace_invites" enable row level security;


  create table "public"."workspace_members" (
    "id" uuid not null default gen_random_uuid(),
    "workspace_id" uuid not null,
    "user_id" uuid not null,
    "role" text not null default 'member'::text,
    "invited_by" uuid,
    "joined_at" timestamp with time zone not null default now(),
    "removed_at" timestamp with time zone,
    "is_active" boolean not null default true
      );


alter table "public"."workspace_members" enable row level security;


  create table "public"."workspaces" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "created_by" uuid,
    "avatar_url" text,
    "is_personal" boolean not null default false,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."workspaces" enable row level security;

CREATE UNIQUE INDEX admin_user_invites_invite_token_key ON public.admin_user_invites USING btree (invite_token);

CREATE UNIQUE INDEX admin_user_invites_pkey ON public.admin_user_invites USING btree (id);

CREATE UNIQUE INDEX broadcast_members_pkey ON public.broadcast_members USING btree (broadcast_id, user_id);

CREATE UNIQUE INDEX broadcast_messages_pkey ON public.broadcast_messages USING btree (id);

CREATE UNIQUE INDEX broadcasts_pkey ON public.broadcasts USING btree (id);

CREATE UNIQUE INDEX broadcasts_workspace_id_name_key ON public.broadcasts USING btree (workspace_id, name);

CREATE UNIQUE INDEX channel_hidden_memberships_pkey ON public.channel_hidden_memberships USING btree (channel_id, user_id);

CREATE UNIQUE INDEX channel_invites_invite_token_key ON public.channel_invites USING btree (invite_token);

CREATE UNIQUE INDEX channel_invites_pkey ON public.channel_invites USING btree (id);

CREATE UNIQUE INDEX channel_members_channel_id_user_id_key ON public.channel_members USING btree (channel_id, user_id);

CREATE UNIQUE INDEX channel_members_pkey ON public.channel_members USING btree (id);

CREATE UNIQUE INDEX channels_pkey ON public.channels USING btree (id);

CREATE UNIQUE INDEX chat_archives_pkey ON public.chat_archives USING btree (id);

CREATE UNIQUE INDEX chat_archives_unique_chat ON public.chat_archives USING btree (user_id, channel_id, dm_id, broadcast_id);

CREATE UNIQUE INDEX chat_detail_entries_pkey ON public.chat_detail_entries USING btree (id);

CREATE UNIQUE INDEX direct_message_messages_pkey ON public.direct_message_messages USING btree (id);

CREATE UNIQUE INDEX direct_messages_pkey ON public.direct_messages USING btree (id);

CREATE UNIQUE INDEX direct_messages_user1_id_user2_id_key ON public.direct_messages USING btree (user1_id, user2_id);

CREATE UNIQUE INDEX files_pkey ON public.files USING btree (id);

CREATE INDEX idx_admin_user_invites_invited_by ON public.admin_user_invites USING btree (invited_by);

CREATE INDEX idx_admin_user_invites_invited_email ON public.admin_user_invites USING btree (lower(invited_email));

CREATE INDEX idx_broadcast_messages_broadcast_id_created_at ON public.broadcast_messages USING btree (broadcast_id, created_at DESC);

CREATE INDEX idx_broadcast_messages_workspace_id ON public.broadcast_messages USING btree (workspace_id);

CREATE INDEX idx_channel_invites_channel_id ON public.channel_invites USING btree (channel_id);

CREATE INDEX idx_channel_invites_invited_by ON public.channel_invites USING btree (invited_by);

CREATE INDEX idx_channel_invites_invited_email ON public.channel_invites USING btree (lower(invited_email));

CREATE INDEX idx_channel_members_channel ON public.channel_members USING btree (channel_id);

CREATE INDEX idx_channel_members_channel_joined ON public.channel_members USING btree (channel_id, joined_at DESC);

CREATE INDEX idx_channel_members_unread ON public.channel_members USING btree (channel_id, last_read_at);

CREATE INDEX idx_channel_members_user ON public.channel_members USING btree (user_id);

CREATE INDEX idx_channel_members_user_joined ON public.channel_members USING btree (user_id, joined_at DESC);

CREATE INDEX idx_channels_created_by_created_at ON public.channels USING btree (created_by, created_at DESC);

CREATE INDEX idx_channels_is_private ON public.channels USING btree (is_private);

CREATE INDEX idx_channels_name_trgm ON public.channels USING gin (lower(name) public.gin_trgm_ops);

CREATE UNIQUE INDEX idx_channels_owner_default_name_unique ON public.channels USING btree (created_by, lower(name)) WHERE ((created_by IS NOT NULL) AND (lower(name) = ANY (ARRAY['general'::text, 'ideas'::text, 'support'::text])));

CREATE INDEX idx_channels_public_created_at ON public.channels USING btree (created_at DESC) WHERE (is_private = false);

CREATE INDEX idx_channels_workspace_id ON public.channels USING btree (workspace_id);

CREATE INDEX idx_chat_archives_user_workspace ON public.chat_archives USING btree (user_id, workspace_id);

CREATE UNIQUE INDEX idx_chat_detail_entries_user_channel ON public.chat_detail_entries USING btree (user_id, channel_id) WHERE (channel_id IS NOT NULL);

CREATE UNIQUE INDEX idx_chat_detail_entries_user_dm ON public.chat_detail_entries USING btree (user_id, dm_id) WHERE (dm_id IS NOT NULL);

CREATE INDEX idx_direct_message_messages_broadcast_message_id ON public.direct_message_messages USING btree (broadcast_message_id);

CREATE INDEX idx_direct_messages_created_at ON public.direct_messages USING btree (created_at DESC);

CREATE INDEX idx_direct_messages_user1_created ON public.direct_messages USING btree (user1_id, created_at DESC);

CREATE INDEX idx_direct_messages_user1_id ON public.direct_messages USING btree (user1_id);

CREATE INDEX idx_direct_messages_user2_created ON public.direct_messages USING btree (user2_id, created_at DESC);

CREATE INDEX idx_direct_messages_user2_id ON public.direct_messages USING btree (user2_id);

CREATE INDEX idx_direct_messages_workspace_id ON public.direct_messages USING btree (workspace_id);

CREATE UNIQUE INDEX idx_direct_messages_workspace_users ON public.direct_messages USING btree (workspace_id, user1_id, user2_id) WHERE (workspace_id IS NOT NULL);

CREATE INDEX idx_dm_messages_active ON public.direct_message_messages USING btree (dm_id, created_at DESC) WHERE (is_deleted = false);

CREATE INDEX idx_dm_messages_attachment_url ON public.direct_message_messages USING btree (attachment_url) WHERE (attachment_url IS NOT NULL);

CREATE INDEX idx_dm_messages_created ON public.direct_message_messages USING btree (created_at DESC);

CREATE INDEX idx_dm_messages_dm ON public.direct_message_messages USING btree (dm_id);

CREATE INDEX idx_dm_messages_dm_created ON public.direct_message_messages USING btree (dm_id, created_at DESC);

CREATE INDEX idx_dm_messages_thread ON public.direct_message_messages USING btree (thread_id, created_at);

CREATE INDEX idx_dm_messages_unread ON public.direct_message_messages USING btree (dm_id) WHERE (is_read = false);

CREATE INDEX idx_dm_messages_workspace_id ON public.direct_message_messages USING btree (workspace_id);

CREATE INDEX idx_files_channel ON public.files USING btree (channel_id);

CREATE INDEX idx_files_message ON public.files USING btree (message_id);

CREATE INDEX idx_message_bookmarks_message_created_at ON public.message_bookmarks USING btree (message_id, created_at DESC);

CREATE INDEX idx_message_bookmarks_message_id ON public.message_bookmarks USING btree (message_id);

CREATE INDEX idx_message_bookmarks_user_covering ON public.message_bookmarks USING btree (user_id) INCLUDE (message_id, note, created_at);

CREATE INDEX idx_message_bookmarks_user_created_at_desc ON public.message_bookmarks USING btree (user_id, created_at DESC);

CREATE INDEX idx_message_bookmarks_user_id ON public.message_bookmarks USING btree (user_id);

CREATE INDEX idx_message_forwards_created_at ON public.message_forwards USING btree (created_at);

CREATE INDEX idx_message_forwards_forwarded_by ON public.message_forwards USING btree (forwarded_by);

CREATE INDEX idx_message_forwards_forwarded_by_created_at ON public.message_forwards USING btree (forwarded_by, created_at DESC);

CREATE INDEX idx_message_forwards_new_message_id ON public.message_forwards USING btree (new_message_id);

CREATE INDEX idx_message_forwards_original_created_at ON public.message_forwards USING btree (original_message_id, created_at DESC);

CREATE INDEX idx_message_forwards_original_message_id ON public.message_forwards USING btree (original_message_id);

CREATE INDEX idx_message_mentions_message_id ON public.message_mentions USING btree (message_id);

CREATE INDEX idx_message_mentions_user_id ON public.message_mentions USING btree (mentioned_user_id);

CREATE INDEX idx_message_reactions_broadcast ON public.message_reactions USING btree (broadcast_id) WHERE (broadcast_id IS NOT NULL);

CREATE INDEX idx_message_reactions_message_created ON public.message_reactions USING btree (message_id, created_at DESC);

CREATE INDEX idx_message_reactions_message_emoji ON public.message_reactions USING btree (message_id, emoji);

CREATE INDEX idx_message_reactions_message_id ON public.message_reactions USING btree (message_id);

CREATE INDEX idx_message_reactions_message_user ON public.message_reactions USING btree (message_id, user_id);

CREATE INDEX idx_message_reactions_user_created ON public.message_reactions USING btree (user_id, created_at DESC);

CREATE INDEX idx_message_reactions_user_id ON public.message_reactions USING btree (user_id);

CREATE INDEX idx_message_reactions_workspace_id ON public.message_reactions USING btree (workspace_id);

CREATE INDEX idx_message_read_receipts_message_id ON public.message_read_receipts USING btree (message_id);

CREATE INDEX idx_message_read_receipts_user_id ON public.message_read_receipts USING btree (user_id);

CREATE INDEX idx_message_todos_channel ON public.message_todos USING btree (channel_id) WHERE (channel_id IS NOT NULL);

CREATE INDEX idx_message_todos_channel_id ON public.message_todos USING btree (channel_id);

CREATE INDEX idx_message_todos_dm ON public.message_todos USING btree (dm_id) WHERE (dm_id IS NOT NULL);

CREATE INDEX idx_message_todos_dm_id ON public.message_todos USING btree (dm_id);

CREATE INDEX idx_message_todos_message ON public.message_todos USING btree (message_source, message_id);

CREATE INDEX idx_message_todos_user_status ON public.message_todos USING btree (user_id, status);

CREATE INDEX idx_messages_attachment_url ON public.messages USING btree (attachment_url) WHERE (attachment_url IS NOT NULL);

CREATE INDEX idx_messages_channel ON public.messages USING btree (channel_id);

CREATE INDEX idx_messages_channel_created ON public.messages USING btree (channel_id, created_at DESC);

CREATE INDEX idx_messages_created ON public.messages USING btree (created_at DESC);

CREATE INDEX idx_messages_deleted_at ON public.messages USING btree (deleted_at);

CREATE INDEX idx_messages_parent ON public.messages USING btree (parent_id);

CREATE INDEX idx_messages_parent_created ON public.messages USING btree (parent_id, created_at);

CREATE INDEX idx_messages_thread_created ON public.messages USING btree (thread_id, created_at);

CREATE INDEX idx_messages_thread_id ON public.messages USING btree (thread_id);

CREATE INDEX idx_messages_user ON public.messages USING btree (user_id);

CREATE INDEX idx_messages_workspace_id ON public.messages USING btree (workspace_id);

CREATE INDEX idx_mhfu_message_id ON public.message_hidden_for_users USING btree (message_id);

CREATE INDEX idx_mhfu_user_id ON public.message_hidden_for_users USING btree (user_id);

CREATE INDEX idx_mhfu_user_message ON public.message_hidden_for_users USING btree (user_id, message_id);

CREATE INDEX idx_mhfu_user_source ON public.message_hidden_for_users USING btree (user_id, source_table);

CREATE INDEX idx_mrr_message_created ON public.message_read_receipts USING btree (message_id, read_at DESC);

CREATE INDEX idx_mrr_read_at ON public.message_read_receipts USING btree (read_at DESC);

CREATE INDEX idx_mrr_user_message ON public.message_read_receipts USING btree (user_id, message_id);

CREATE INDEX idx_pinned_messages_channel_created ON public.pinned_messages USING btree (channel_id, created_at DESC);

CREATE INDEX idx_pinned_messages_channel_id ON public.pinned_messages USING btree (channel_id);

CREATE INDEX idx_pinned_messages_channel_only ON public.pinned_messages USING btree (channel_id, created_at DESC) WHERE (channel_id IS NOT NULL);

CREATE INDEX idx_pinned_messages_dm_created ON public.pinned_messages USING btree (dm_id, created_at DESC);

CREATE INDEX idx_pinned_messages_dm_id ON public.pinned_messages USING btree (dm_id);

CREATE INDEX idx_pinned_messages_dm_only ON public.pinned_messages USING btree (dm_id, created_at DESC) WHERE (dm_id IS NOT NULL);

CREATE INDEX idx_pinned_messages_pinned_by ON public.pinned_messages USING btree (pinned_by);

CREATE INDEX idx_profiles_admin_user_id ON public.profiles USING btree (admin_user_id);

CREATE INDEX idx_profiles_deleted_by_admin_user_id ON public.profiles USING btree (deleted_by_admin_user_id);

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);

CREATE INDEX idx_profiles_full_name_trgm ON public.profiles USING gin (full_name public.gin_trgm_ops);

CREATE INDEX idx_profiles_is_online ON public.profiles USING btree (is_online) WHERE (is_online = true);

CREATE INDEX idx_profiles_is_signedin ON public.profiles USING btree (is_signedin) WHERE (is_signedin = true);

CREATE INDEX idx_profiles_last_seen ON public.profiles USING btree (last_seen DESC);

CREATE INDEX idx_profiles_not_deleted ON public.profiles USING btree (deleted_from_admin_at) WHERE (deleted_from_admin_at IS NULL);

CREATE INDEX idx_profiles_online_last_seen ON public.profiles USING btree (is_online, last_seen DESC);

CREATE INDEX idx_typing_channel ON public.typing_indicators USING btree (channel_id);

CREATE INDEX idx_typing_dm ON public.typing_indicators USING btree (dm_id);

CREATE INDEX idx_workspace_invites_email ON public.workspace_invites USING btree (lower(invited_email));

CREATE INDEX idx_workspace_invites_workspace_id ON public.workspace_invites USING btree (workspace_id);

CREATE INDEX idx_workspace_members_user_id ON public.workspace_members USING btree (user_id);

CREATE INDEX idx_workspace_members_workspace_active_user ON public.workspace_members USING btree (workspace_id, is_active, user_id) WHERE (removed_at IS NULL);

CREATE UNIQUE INDEX idx_workspaces_personal_owner ON public.workspaces USING btree (created_by) WHERE (is_personal = true);

CREATE UNIQUE INDEX message_bookmarks_message_id_user_id_key ON public.message_bookmarks USING btree (message_id, user_id);

CREATE UNIQUE INDEX message_bookmarks_pkey ON public.message_bookmarks USING btree (id);

CREATE UNIQUE INDEX message_forwards_pkey ON public.message_forwards USING btree (id);

CREATE UNIQUE INDEX message_hidden_for_users_pkey ON public.message_hidden_for_users USING btree (id);

CREATE UNIQUE INDEX message_hidden_for_users_unique ON public.message_hidden_for_users USING btree (message_id, user_id, source_table);

CREATE UNIQUE INDEX message_mentions_pkey ON public.message_mentions USING btree (id);

CREATE UNIQUE INDEX message_reactions_message_id_user_id_emoji_key ON public.message_reactions USING btree (message_id, user_id, emoji);

CREATE UNIQUE INDEX message_reactions_pkey ON public.message_reactions USING btree (id);

CREATE UNIQUE INDEX message_read_receipts_message_id_user_id_key ON public.message_read_receipts USING btree (message_id, user_id);

CREATE UNIQUE INDEX message_read_receipts_pkey ON public.message_read_receipts USING btree (id);

CREATE UNIQUE INDEX message_todos_message_id_message_source_key ON public.message_todos USING btree (message_id, message_source);

CREATE UNIQUE INDEX message_todos_pkey ON public.message_todos USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE INDEX notifications_actor_idx ON public.notifications USING btree (actor_id);

CREATE INDEX notifications_entity_idx ON public.notifications USING btree (entity_id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX notifications_user_created_idx ON public.notifications USING btree (user_id, created_at DESC);

CREATE INDEX notifications_user_type_idx ON public.notifications USING btree (user_id, type, created_at DESC);

CREATE INDEX notifications_user_unread_idx ON public.notifications USING btree (user_id, created_at DESC) WHERE (is_read = false);

CREATE UNIQUE INDEX pinned_messages_message_id_key ON public.pinned_messages USING btree (message_id);

CREATE UNIQUE INDEX pinned_messages_pkey ON public.pinned_messages USING btree (id);

CREATE UNIQUE INDEX profiles_avatar_color_key ON public.profiles USING btree (avatar_color);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id);

CREATE UNIQUE INDEX push_subscriptions_user_id_endpoint_key ON public.push_subscriptions USING btree (user_id, endpoint);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions USING btree (user_id);

CREATE UNIQUE INDEX signup_trigger_errors_pkey ON public.signup_trigger_errors USING btree (id);

CREATE UNIQUE INDEX typing_indicators_pkey ON public.typing_indicators USING btree (id);

CREATE UNIQUE INDEX unique_user_device ON public.push_subscriptions USING btree (user_id, device_id);

CREATE UNIQUE INDEX workspace_invites_invite_token_key ON public.workspace_invites USING btree (invite_token);

CREATE UNIQUE INDEX workspace_invites_pkey ON public.workspace_invites USING btree (id);

CREATE UNIQUE INDEX workspace_members_pkey ON public.workspace_members USING btree (id);

CREATE UNIQUE INDEX workspace_members_workspace_id_user_id_key ON public.workspace_members USING btree (workspace_id, user_id);

CREATE UNIQUE INDEX workspaces_pkey ON public.workspaces USING btree (id);

CREATE UNIQUE INDEX workspaces_slug_key ON public.workspaces USING btree (slug);

alter table "public"."admin_user_invites" add constraint "admin_user_invites_pkey" PRIMARY KEY using index "admin_user_invites_pkey";

alter table "public"."broadcast_members" add constraint "broadcast_members_pkey" PRIMARY KEY using index "broadcast_members_pkey";

alter table "public"."broadcast_messages" add constraint "broadcast_messages_pkey" PRIMARY KEY using index "broadcast_messages_pkey";

alter table "public"."broadcasts" add constraint "broadcasts_pkey" PRIMARY KEY using index "broadcasts_pkey";

alter table "public"."channel_hidden_memberships" add constraint "channel_hidden_memberships_pkey" PRIMARY KEY using index "channel_hidden_memberships_pkey";

alter table "public"."channel_invites" add constraint "channel_invites_pkey" PRIMARY KEY using index "channel_invites_pkey";

alter table "public"."channel_members" add constraint "channel_members_pkey" PRIMARY KEY using index "channel_members_pkey";

alter table "public"."channels" add constraint "channels_pkey" PRIMARY KEY using index "channels_pkey";

alter table "public"."chat_archives" add constraint "chat_archives_pkey" PRIMARY KEY using index "chat_archives_pkey";

alter table "public"."chat_detail_entries" add constraint "chat_detail_entries_pkey" PRIMARY KEY using index "chat_detail_entries_pkey";

alter table "public"."direct_message_messages" add constraint "direct_message_messages_pkey" PRIMARY KEY using index "direct_message_messages_pkey";

alter table "public"."direct_messages" add constraint "direct_messages_pkey" PRIMARY KEY using index "direct_messages_pkey";

alter table "public"."files" add constraint "files_pkey" PRIMARY KEY using index "files_pkey";

alter table "public"."message_bookmarks" add constraint "message_bookmarks_pkey" PRIMARY KEY using index "message_bookmarks_pkey";

alter table "public"."message_forwards" add constraint "message_forwards_pkey" PRIMARY KEY using index "message_forwards_pkey";

alter table "public"."message_hidden_for_users" add constraint "message_hidden_for_users_pkey" PRIMARY KEY using index "message_hidden_for_users_pkey";

alter table "public"."message_mentions" add constraint "message_mentions_pkey" PRIMARY KEY using index "message_mentions_pkey";

alter table "public"."message_reactions" add constraint "message_reactions_pkey" PRIMARY KEY using index "message_reactions_pkey";

alter table "public"."message_read_receipts" add constraint "message_read_receipts_pkey" PRIMARY KEY using index "message_read_receipts_pkey";

alter table "public"."message_todos" add constraint "message_todos_pkey" PRIMARY KEY using index "message_todos_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."pinned_messages" add constraint "pinned_messages_pkey" PRIMARY KEY using index "pinned_messages_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_pkey" PRIMARY KEY using index "push_subscriptions_pkey";

alter table "public"."signup_trigger_errors" add constraint "signup_trigger_errors_pkey" PRIMARY KEY using index "signup_trigger_errors_pkey";

alter table "public"."typing_indicators" add constraint "typing_indicators_pkey" PRIMARY KEY using index "typing_indicators_pkey";

alter table "public"."workspace_invites" add constraint "workspace_invites_pkey" PRIMARY KEY using index "workspace_invites_pkey";

alter table "public"."workspace_members" add constraint "workspace_members_pkey" PRIMARY KEY using index "workspace_members_pkey";

alter table "public"."workspaces" add constraint "workspaces_pkey" PRIMARY KEY using index "workspaces_pkey";

alter table "public"."admin_user_invites" add constraint "admin_user_invites_invite_token_key" UNIQUE using index "admin_user_invites_invite_token_key";

alter table "public"."admin_user_invites" add constraint "admin_user_invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."admin_user_invites" validate constraint "admin_user_invites_invited_by_fkey";

alter table "public"."admin_user_invites" add constraint "admin_user_invites_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."admin_user_invites" validate constraint "admin_user_invites_workspace_id_fkey";

alter table "public"."broadcast_members" add constraint "broadcast_members_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE CASCADE not valid;

alter table "public"."broadcast_members" validate constraint "broadcast_members_broadcast_id_fkey";

alter table "public"."broadcast_members" add constraint "broadcast_members_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text]))) not valid;

alter table "public"."broadcast_members" validate constraint "broadcast_members_role_check";

alter table "public"."broadcast_members" add constraint "broadcast_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."broadcast_members" validate constraint "broadcast_members_user_id_fkey";

alter table "public"."broadcast_messages" add constraint "broadcast_messages_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE CASCADE not valid;

alter table "public"."broadcast_messages" validate constraint "broadcast_messages_broadcast_id_fkey";

alter table "public"."broadcast_messages" add constraint "broadcast_messages_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."broadcast_messages" validate constraint "broadcast_messages_deleted_by_fkey";

alter table "public"."broadcast_messages" add constraint "broadcast_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."broadcast_messages" validate constraint "broadcast_messages_user_id_fkey";

alter table "public"."broadcast_messages" add constraint "broadcast_messages_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."broadcast_messages" validate constraint "broadcast_messages_workspace_id_fkey";

alter table "public"."broadcasts" add constraint "broadcasts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."broadcasts" validate constraint "broadcasts_created_by_fkey";

alter table "public"."broadcasts" add constraint "broadcasts_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."broadcasts" validate constraint "broadcasts_workspace_id_fkey";

alter table "public"."broadcasts" add constraint "broadcasts_workspace_id_name_key" UNIQUE using index "broadcasts_workspace_id_name_key";

alter table "public"."channel_hidden_memberships" add constraint "channel_hidden_memberships_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."channel_hidden_memberships" validate constraint "channel_hidden_memberships_channel_id_fkey";

alter table "public"."channel_hidden_memberships" add constraint "channel_hidden_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."channel_hidden_memberships" validate constraint "channel_hidden_memberships_user_id_fkey";

alter table "public"."channel_invites" add constraint "channel_invites_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."channel_invites" validate constraint "channel_invites_channel_id_fkey";

alter table "public"."channel_invites" add constraint "channel_invites_dm_id_fkey" FOREIGN KEY (dm_id) REFERENCES public.direct_messages(id) ON DELETE SET NULL not valid;

alter table "public"."channel_invites" validate constraint "channel_invites_dm_id_fkey";

alter table "public"."channel_invites" add constraint "channel_invites_invite_token_key" UNIQUE using index "channel_invites_invite_token_key";

alter table "public"."channel_invites" add constraint "channel_invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."channel_invites" validate constraint "channel_invites_invited_by_fkey";

alter table "public"."channel_invites" add constraint "channel_invites_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."channel_invites" validate constraint "channel_invites_workspace_id_fkey";

alter table "public"."channel_members" add constraint "channel_members_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."channel_members" validate constraint "channel_members_channel_id_fkey";

alter table "public"."channel_members" add constraint "channel_members_channel_id_user_id_key" UNIQUE using index "channel_members_channel_id_user_id_key";

alter table "public"."channel_members" add constraint "channel_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."channel_members" validate constraint "channel_members_user_id_fkey";

alter table "public"."channels" add constraint "channels_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."channels" validate constraint "channels_created_by_fkey";

alter table "public"."channels" add constraint "channels_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."channels" validate constraint "channels_workspace_id_fkey";

alter table "public"."chat_archives" add constraint "chat_archives_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE CASCADE not valid;

alter table "public"."chat_archives" validate constraint "chat_archives_broadcast_id_fkey";

alter table "public"."chat_archives" add constraint "chat_archives_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."chat_archives" validate constraint "chat_archives_channel_id_fkey";

alter table "public"."chat_archives" add constraint "chat_archives_dm_id_fkey" FOREIGN KEY (dm_id) REFERENCES public.direct_messages(id) ON DELETE CASCADE not valid;

alter table "public"."chat_archives" validate constraint "chat_archives_dm_id_fkey";

alter table "public"."chat_archives" add constraint "chat_archives_one_chat" CHECK ((((channel_id IS NOT NULL) AND (dm_id IS NULL) AND (broadcast_id IS NULL)) OR ((channel_id IS NULL) AND (dm_id IS NOT NULL) AND (broadcast_id IS NULL)) OR ((channel_id IS NULL) AND (dm_id IS NULL) AND (broadcast_id IS NOT NULL)))) not valid;

alter table "public"."chat_archives" validate constraint "chat_archives_one_chat";

alter table "public"."chat_archives" add constraint "chat_archives_unique_chat" UNIQUE using index "chat_archives_unique_chat";

alter table "public"."chat_archives" add constraint "chat_archives_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_archives" validate constraint "chat_archives_user_id_fkey";

alter table "public"."chat_archives" add constraint "chat_archives_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."chat_archives" validate constraint "chat_archives_workspace_id_fkey";

alter table "public"."chat_detail_entries" add constraint "chat_detail_entries_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."chat_detail_entries" validate constraint "chat_detail_entries_channel_id_fkey";

alter table "public"."chat_detail_entries" add constraint "chat_detail_entries_dm_id_fkey" FOREIGN KEY (dm_id) REFERENCES public.direct_messages(id) ON DELETE CASCADE not valid;

alter table "public"."chat_detail_entries" validate constraint "chat_detail_entries_dm_id_fkey";

alter table "public"."chat_detail_entries" add constraint "chat_detail_entries_target_check" CHECK ((((channel_id IS NOT NULL) AND (dm_id IS NULL)) OR ((channel_id IS NULL) AND (dm_id IS NOT NULL)))) not valid;

alter table "public"."chat_detail_entries" validate constraint "chat_detail_entries_target_check";

alter table "public"."chat_detail_entries" add constraint "chat_detail_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_detail_entries" validate constraint "chat_detail_entries_user_id_fkey";

alter table "public"."direct_message_messages" add constraint "direct_message_messages_broadcast_message_id_fkey" FOREIGN KEY (broadcast_message_id) REFERENCES public.broadcast_messages(id) ON DELETE SET NULL not valid;

alter table "public"."direct_message_messages" validate constraint "direct_message_messages_broadcast_message_id_fkey";

alter table "public"."direct_message_messages" add constraint "direct_message_messages_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."direct_message_messages" validate constraint "direct_message_messages_deleted_by_fkey";

alter table "public"."direct_message_messages" add constraint "direct_message_messages_dm_id_fkey" FOREIGN KEY (dm_id) REFERENCES public.direct_messages(id) ON DELETE CASCADE not valid;

alter table "public"."direct_message_messages" validate constraint "direct_message_messages_dm_id_fkey";

alter table "public"."direct_message_messages" add constraint "direct_message_messages_status_check" CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text]))) not valid;

alter table "public"."direct_message_messages" validate constraint "direct_message_messages_status_check";

alter table "public"."direct_message_messages" add constraint "direct_message_messages_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.direct_message_messages(id) ON DELETE CASCADE not valid;

alter table "public"."direct_message_messages" validate constraint "direct_message_messages_thread_id_fkey";

alter table "public"."direct_message_messages" add constraint "direct_message_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."direct_message_messages" validate constraint "direct_message_messages_user_id_fkey";

alter table "public"."direct_message_messages" add constraint "direct_message_messages_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."direct_message_messages" validate constraint "direct_message_messages_workspace_id_fkey";

alter table "public"."direct_messages" add constraint "direct_messages_check" CHECK ((user1_id < user2_id)) not valid;

alter table "public"."direct_messages" validate constraint "direct_messages_check";

alter table "public"."direct_messages" add constraint "direct_messages_user1_id_fkey" FOREIGN KEY (user1_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."direct_messages" validate constraint "direct_messages_user1_id_fkey";

alter table "public"."direct_messages" add constraint "direct_messages_user1_id_user2_id_key" UNIQUE using index "direct_messages_user1_id_user2_id_key";

alter table "public"."direct_messages" add constraint "direct_messages_user2_id_fkey" FOREIGN KEY (user2_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."direct_messages" validate constraint "direct_messages_user2_id_fkey";

alter table "public"."direct_messages" add constraint "direct_messages_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."direct_messages" validate constraint "direct_messages_workspace_id_fkey";

alter table "public"."files" add constraint "files_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."files" validate constraint "files_channel_id_fkey";

alter table "public"."files" add constraint "files_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE not valid;

alter table "public"."files" validate constraint "files_message_id_fkey";

alter table "public"."files" add constraint "files_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."files" validate constraint "files_uploaded_by_fkey";

alter table "public"."files" add constraint "files_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."files" validate constraint "files_workspace_id_fkey";

alter table "public"."message_bookmarks" add constraint "message_bookmarks_message_id_user_id_key" UNIQUE using index "message_bookmarks_message_id_user_id_key";

alter table "public"."message_bookmarks" add constraint "message_bookmarks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."message_bookmarks" validate constraint "message_bookmarks_user_id_fkey";

alter table "public"."message_forwards" add constraint "message_forwards_forwarded_by_fkey" FOREIGN KEY (forwarded_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."message_forwards" validate constraint "message_forwards_forwarded_by_fkey";

alter table "public"."message_hidden_for_users" add constraint "message_hidden_for_users_unique" UNIQUE using index "message_hidden_for_users_unique";

alter table "public"."message_hidden_for_users" add constraint "message_hidden_for_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "public"."message_hidden_for_users" validate constraint "message_hidden_for_users_user_id_fkey";

alter table "public"."message_mentions" add constraint "message_mentions_mention_type_check" CHECK ((mention_type = ANY (ARRAY['user'::text, 'channel'::text, 'everyone'::text]))) not valid;

alter table "public"."message_mentions" validate constraint "message_mentions_mention_type_check";

alter table "public"."message_mentions" add constraint "message_mentions_mentioned_user_id_fkey" FOREIGN KEY (mentioned_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."message_mentions" validate constraint "message_mentions_mentioned_user_id_fkey";

alter table "public"."message_reactions" add constraint "message_reactions_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE CASCADE not valid;

alter table "public"."message_reactions" validate constraint "message_reactions_broadcast_id_fkey";

alter table "public"."message_reactions" add constraint "message_reactions_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."message_reactions" validate constraint "message_reactions_channel_id_fkey";

alter table "public"."message_reactions" add constraint "message_reactions_dm_id_fkey" FOREIGN KEY (dm_id) REFERENCES public.direct_messages(id) ON DELETE CASCADE not valid;

alter table "public"."message_reactions" validate constraint "message_reactions_dm_id_fkey";

alter table "public"."message_reactions" add constraint "message_reactions_message_id_user_id_emoji_key" UNIQUE using index "message_reactions_message_id_user_id_emoji_key";

alter table "public"."message_reactions" add constraint "message_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."message_reactions" validate constraint "message_reactions_user_id_fkey";

alter table "public"."message_reactions" add constraint "message_reactions_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."message_reactions" validate constraint "message_reactions_workspace_id_fkey";

alter table "public"."message_read_receipts" add constraint "message_read_receipts_message_id_user_id_key" UNIQUE using index "message_read_receipts_message_id_user_id_key";

alter table "public"."message_read_receipts" add constraint "message_read_receipts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."message_read_receipts" validate constraint "message_read_receipts_user_id_fkey";

alter table "public"."message_todos" add constraint "message_todos_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE CASCADE not valid;

alter table "public"."message_todos" validate constraint "message_todos_broadcast_id_fkey";

alter table "public"."message_todos" add constraint "message_todos_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."message_todos" validate constraint "message_todos_channel_id_fkey";

alter table "public"."message_todos" add constraint "message_todos_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."message_todos" validate constraint "message_todos_completed_by_fkey";

alter table "public"."message_todos" add constraint "message_todos_dm_id_fkey" FOREIGN KEY (dm_id) REFERENCES public.direct_messages(id) ON DELETE CASCADE not valid;

alter table "public"."message_todos" validate constraint "message_todos_dm_id_fkey";

alter table "public"."message_todos" add constraint "message_todos_message_id_message_source_key" UNIQUE using index "message_todos_message_id_message_source_key";

alter table "public"."message_todos" add constraint "message_todos_message_source_check" CHECK ((message_source = ANY (ARRAY['channel'::text, 'dm'::text]))) not valid;

alter table "public"."message_todos" validate constraint "message_todos_message_source_check";

alter table "public"."message_todos" add constraint "message_todos_one_conversation" CHECK ((((channel_id IS NOT NULL) AND (dm_id IS NULL) AND (broadcast_id IS NULL) AND (message_source = 'channel'::text)) OR ((channel_id IS NULL) AND (dm_id IS NOT NULL) AND (broadcast_id IS NULL) AND (message_source = 'dm'::text)) OR ((channel_id IS NULL) AND (dm_id IS NULL) AND (broadcast_id IS NOT NULL) AND (message_source = 'broadcast'::text)))) not valid;

alter table "public"."message_todos" validate constraint "message_todos_one_conversation";

alter table "public"."message_todos" add constraint "message_todos_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'done'::text]))) not valid;

alter table "public"."message_todos" validate constraint "message_todos_status_check";

alter table "public"."message_todos" add constraint "message_todos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."message_todos" validate constraint "message_todos_user_id_fkey";

alter table "public"."message_todos" add constraint "message_todos_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."message_todos" validate constraint "message_todos_workspace_id_fkey";

alter table "public"."messages" add constraint "messages_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_channel_id_fkey";

alter table "public"."messages" add constraint "messages_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."messages" validate constraint "messages_deleted_by_fkey";

alter table "public"."messages" add constraint "messages_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.messages(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_parent_id_fkey";

alter table "public"."messages" add constraint "messages_status_check" CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text]))) not valid;

alter table "public"."messages" validate constraint "messages_status_check";

alter table "public"."messages" add constraint "messages_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.messages(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_thread_id_fkey";

alter table "public"."messages" add constraint "messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_user_id_fkey";

alter table "public"."messages" add constraint "messages_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_workspace_id_fkey";

alter table "public"."notifications" add constraint "notifications_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES public.profiles(id) not valid;

alter table "public"."notifications" validate constraint "notifications_actor_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."pinned_messages" add constraint "pinned_messages_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE CASCADE not valid;

alter table "public"."pinned_messages" validate constraint "pinned_messages_broadcast_id_fkey";

alter table "public"."pinned_messages" add constraint "pinned_messages_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."pinned_messages" validate constraint "pinned_messages_channel_id_fkey";

alter table "public"."pinned_messages" add constraint "pinned_messages_dm_id_fkey" FOREIGN KEY (dm_id) REFERENCES public.direct_messages(id) ON DELETE CASCADE not valid;

alter table "public"."pinned_messages" validate constraint "pinned_messages_dm_id_fkey";

alter table "public"."pinned_messages" add constraint "pinned_messages_message_id_key" UNIQUE using index "pinned_messages_message_id_key";

alter table "public"."pinned_messages" add constraint "pinned_messages_one_chat" CHECK ((((channel_id IS NOT NULL) AND (dm_id IS NULL) AND (broadcast_id IS NULL)) OR ((channel_id IS NULL) AND (dm_id IS NOT NULL) AND (broadcast_id IS NULL)) OR ((channel_id IS NULL) AND (dm_id IS NULL) AND (broadcast_id IS NOT NULL)))) not valid;

alter table "public"."pinned_messages" validate constraint "pinned_messages_one_chat";

alter table "public"."pinned_messages" add constraint "pinned_messages_pinned_by_fkey" FOREIGN KEY (pinned_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."pinned_messages" validate constraint "pinned_messages_pinned_by_fkey";

alter table "public"."profiles" add constraint "profiles_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_admin_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_avatar_color_key" UNIQUE using index "profiles_avatar_color_key";

alter table "public"."profiles" add constraint "profiles_deleted_by_admin_user_id_fkey" FOREIGN KEY (deleted_by_admin_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_deleted_by_admin_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_user_id_endpoint_key" UNIQUE using index "push_subscriptions_user_id_endpoint_key";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."push_subscriptions" validate constraint "push_subscriptions_user_id_fkey";

alter table "public"."push_subscriptions" add constraint "unique_user_device" UNIQUE using index "unique_user_device";

alter table "public"."typing_indicators" add constraint "typing_indicators_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE CASCADE not valid;

alter table "public"."typing_indicators" validate constraint "typing_indicators_broadcast_id_fkey";

alter table "public"."typing_indicators" add constraint "typing_indicators_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.channels(id) ON DELETE CASCADE not valid;

alter table "public"."typing_indicators" validate constraint "typing_indicators_channel_id_fkey";

alter table "public"."typing_indicators" add constraint "typing_indicators_dm_id_fkey" FOREIGN KEY (dm_id) REFERENCES public.direct_messages(id) ON DELETE CASCADE not valid;

alter table "public"."typing_indicators" validate constraint "typing_indicators_dm_id_fkey";

alter table "public"."typing_indicators" add constraint "typing_indicators_one_chat" CHECK ((((channel_id IS NOT NULL) AND (dm_id IS NULL) AND (broadcast_id IS NULL)) OR ((channel_id IS NULL) AND (dm_id IS NOT NULL) AND (broadcast_id IS NULL)) OR ((channel_id IS NULL) AND (dm_id IS NULL) AND (broadcast_id IS NOT NULL)))) not valid;

alter table "public"."typing_indicators" validate constraint "typing_indicators_one_chat";

alter table "public"."typing_indicators" add constraint "typing_indicators_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."typing_indicators" validate constraint "typing_indicators_user_id_fkey";

alter table "public"."typing_indicators" add constraint "typing_indicators_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."typing_indicators" validate constraint "typing_indicators_workspace_id_fkey";

alter table "public"."workspace_invites" add constraint "workspace_invites_invite_token_key" UNIQUE using index "workspace_invites_invite_token_key";

alter table "public"."workspace_invites" add constraint "workspace_invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."workspace_invites" validate constraint "workspace_invites_invited_by_fkey";

alter table "public"."workspace_invites" add constraint "workspace_invites_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text, 'guest'::text]))) not valid;

alter table "public"."workspace_invites" validate constraint "workspace_invites_role_check";

alter table "public"."workspace_invites" add constraint "workspace_invites_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."workspace_invites" validate constraint "workspace_invites_workspace_id_fkey";

alter table "public"."workspace_members" add constraint "workspace_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."workspace_members" validate constraint "workspace_members_invited_by_fkey";

alter table "public"."workspace_members" add constraint "workspace_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'guest'::text]))) not valid;

alter table "public"."workspace_members" validate constraint "workspace_members_role_check";

alter table "public"."workspace_members" add constraint "workspace_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."workspace_members" validate constraint "workspace_members_user_id_fkey";

alter table "public"."workspace_members" add constraint "workspace_members_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE not valid;

alter table "public"."workspace_members" validate constraint "workspace_members_workspace_id_fkey";

alter table "public"."workspace_members" add constraint "workspace_members_workspace_id_user_id_key" UNIQUE using index "workspace_members_workspace_id_user_id_key";

alter table "public"."workspaces" add constraint "workspaces_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."workspaces" validate constraint "workspaces_created_by_fkey";

alter table "public"."workspaces" add constraint "workspaces_slug_key" UNIQUE using index "workspaces_slug_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.accept_channel_invite(p_invite_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  acting_user_id uuid := auth.uid();
  acting_user_email text;
  invite_record record;
BEGIN
  IF acting_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_invite_token IS NULL OR length(trim(p_invite_token)) = 0 THEN
    RAISE EXCEPTION 'Invite token is required';
  END IF;

  SELECT email
  INTO acting_user_email
  FROM public.profiles
  WHERE id = acting_user_id;

  SELECT
    ci.id,
    ci.channel_id,
    ci.invited_email,
    ci.accepted_at,
    ci.expires_at,
    ch.created_by AS channel_owner_id
  INTO invite_record
  FROM public.channel_invites ci
  JOIN public.channels ch
    ON ch.id = ci.channel_id
  WHERE ci.invite_token = p_invite_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF invite_record.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'This invite has already been accepted';
  END IF;

  IF invite_record.expires_at <= now() THEN
    RAISE EXCEPTION 'This invite has expired';
  END IF;

  IF lower(invite_record.invited_email) <> lower(coalesce(acting_user_email, '')) THEN
    RAISE EXCEPTION 'This invite belongs to a different email address';
  END IF;

  INSERT INTO public.channel_members (channel_id, user_id, role)
  VALUES (invite_record.channel_id, acting_user_id, 'member')
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  UPDATE public.channel_invites
  SET accepted_at = now(),
      claimed_at = COALESCE(claimed_at, now())
  WHERE id = invite_record.id
    AND accepted_at IS NULL;

  RETURN invite_record.channel_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_permanently_remove_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  acting_admin_id uuid := auth.uid();
BEGIN
  IF acting_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NULL OR p_user_id = acting_admin_id THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles admin_profile
    WHERE admin_profile.id = acting_admin_id
      AND admin_profile.admin_user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Only workspace admins can remove users';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles target_profile
    WHERE target_profile.id = p_user_id
      AND target_profile.admin_user_id = acting_admin_id
  ) THEN
    RAISE EXCEPTION 'User is not managed by this admin';
  END IF;

  DELETE FROM public.message_reactions mr
  WHERE mr.message_id IN (
    SELECT dmm.id
    FROM public.direct_message_messages dmm
    JOIN public.direct_messages dm
      ON dm.id = dmm.dm_id
    JOIN public.profiles other_profile
      ON other_profile.id = CASE
        WHEN dm.user1_id = p_user_id THEN dm.user2_id
        ELSE dm.user1_id
      END
    WHERE (dm.user1_id = p_user_id OR dm.user2_id = p_user_id)
      AND (
        other_profile.id = acting_admin_id
        OR other_profile.admin_user_id = acting_admin_id
      )
  );

  DELETE FROM public.message_bookmarks mb
  WHERE mb.message_id IN (
    SELECT dmm.id
    FROM public.direct_message_messages dmm
    JOIN public.direct_messages dm
      ON dm.id = dmm.dm_id
    JOIN public.profiles other_profile
      ON other_profile.id = CASE
        WHEN dm.user1_id = p_user_id THEN dm.user2_id
        ELSE dm.user1_id
      END
    WHERE (dm.user1_id = p_user_id OR dm.user2_id = p_user_id)
      AND (
        other_profile.id = acting_admin_id
        OR other_profile.admin_user_id = acting_admin_id
      )
  );

  DELETE FROM public.message_mentions mm
  WHERE mm.message_id IN (
    SELECT dmm.id
    FROM public.direct_message_messages dmm
    JOIN public.direct_messages dm
      ON dm.id = dmm.dm_id
    JOIN public.profiles other_profile
      ON other_profile.id = CASE
        WHEN dm.user1_id = p_user_id THEN dm.user2_id
        ELSE dm.user1_id
      END
    WHERE (dm.user1_id = p_user_id OR dm.user2_id = p_user_id)
      AND (
        other_profile.id = acting_admin_id
        OR other_profile.admin_user_id = acting_admin_id
      )
  );

  DELETE FROM public.message_forwards mf
  WHERE mf.original_message_id IN (
    SELECT dmm.id
    FROM public.direct_message_messages dmm
    JOIN public.direct_messages dm
      ON dm.id = dmm.dm_id
    JOIN public.profiles other_profile
      ON other_profile.id = CASE
        WHEN dm.user1_id = p_user_id THEN dm.user2_id
        ELSE dm.user1_id
      END
    WHERE (dm.user1_id = p_user_id OR dm.user2_id = p_user_id)
      AND (
        other_profile.id = acting_admin_id
        OR other_profile.admin_user_id = acting_admin_id
      )
  )
     OR mf.new_message_id IN (
    SELECT dmm.id
    FROM public.direct_message_messages dmm
    JOIN public.direct_messages dm
      ON dm.id = dmm.dm_id
    JOIN public.profiles other_profile
      ON other_profile.id = CASE
        WHEN dm.user1_id = p_user_id THEN dm.user2_id
        ELSE dm.user1_id
      END
    WHERE (dm.user1_id = p_user_id OR dm.user2_id = p_user_id)
      AND (
        other_profile.id = acting_admin_id
        OR other_profile.admin_user_id = acting_admin_id
      )
  );

  DELETE FROM public.channel_members cm
  USING public.channels ch
  WHERE cm.channel_id = ch.id
    AND ch.created_by = acting_admin_id
    AND cm.user_id = p_user_id;

  DELETE FROM public.direct_messages dm
  USING public.profiles other_profile
  WHERE (dm.user1_id = p_user_id OR dm.user2_id = p_user_id)
    AND other_profile.id = CASE
      WHEN dm.user1_id = p_user_id THEN dm.user2_id
      ELSE dm.user1_id
    END
    AND (
      other_profile.id = acting_admin_id
      OR other_profile.admin_user_id = acting_admin_id
    );

  UPDATE public.profiles
  SET deleted_by_admin_user_id = acting_admin_id,
      deleted_from_admin_at = now()
  WHERE id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_channel_member_system_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor_id uuid := auth.uid();
  actor_name text;
  target_name text;
  message_type text;
  message_channel_id uuid;
  message_user_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    message_channel_id := NEW.channel_id;
    message_user_id := COALESCE(actor_id, NEW.user_id);

    DELETE FROM public.channel_hidden_memberships hidden
    WHERE hidden.channel_id = NEW.channel_id
      AND hidden.user_id = NEW.user_id;

    SELECT COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1), 'Someone')
    INTO actor_name
    FROM public.profiles
    WHERE id = message_user_id;

    SELECT COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1), 'someone')
    INTO target_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    IF actor_id IS NOT NULL AND actor_id <> NEW.user_id THEN
      message_type := 'member_added';
    ELSE
      message_type := 'member_joined';
    END IF;

    INSERT INTO public.messages (channel_id, user_id, content)
    VALUES (
      message_channel_id,
      message_user_id,
      '__channel_system__:' || jsonb_build_object(
        'type', message_type,
        'actorName', COALESCE(actor_name, 'Someone'),
        'targetName', COALESCE(target_name, 'someone')
      )::text
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    message_channel_id := OLD.channel_id;
    message_user_id := COALESCE(actor_id, OLD.user_id);

    INSERT INTO public.channel_hidden_memberships (channel_id, user_id)
    VALUES (OLD.channel_id, OLD.user_id)
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET hidden_at = now();

    SELECT COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1), 'Someone')
    INTO actor_name
    FROM public.profiles
    WHERE id = message_user_id;

    SELECT COALESCE(NULLIF(full_name, ''), split_part(email, '@', 1), 'someone')
    INTO target_name
    FROM public.profiles
    WHERE id = OLD.user_id;

    IF actor_id IS NOT NULL AND actor_id <> OLD.user_id THEN
      message_type := 'member_removed';
    ELSE
      message_type := 'member_left';
    END IF;

    INSERT INTO public.messages (channel_id, user_id, content)
    VALUES (
      message_channel_id,
      message_user_id,
      '__channel_system__:' || jsonb_build_object(
        'type', message_type,
        'actorName', COALESCE(actor_name, 'Someone'),
        'targetName', COALESCE(target_name, 'someone')
      )::text
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_dm_messages_for_broadcast_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  member_record public.broadcast_members%ROWTYPE;
  dm_conversation_id uuid;
  sender_id uuid := NEW.user_id;
  broadcast_workspace_id uuid := NEW.workspace_id;
BEGIN
  -- Iterate over all members of the broadcast
  FOR member_record IN
    SELECT * FROM public.broadcast_members
    WHERE broadcast_id = NEW.broadcast_id AND user_id <> sender_id
  LOOP
    -- Find or create a direct message conversation between sender and member
    SELECT id INTO dm_conversation_id
    FROM public.direct_messages
    WHERE
      workspace_id = broadcast_workspace_id AND
      ((user1_id = sender_id AND user2_id = member_record.user_id) OR
       (user1_id = member_record.user_id AND user2_id = sender_id));

    IF dm_conversation_id IS NULL THEN
      INSERT INTO public.direct_messages (workspace_id, user1_id, user2_id)
      VALUES (broadcast_workspace_id, LEAST(sender_id, member_record.user_id), GREATEST(sender_id, member_record.user_id))
      RETURNING id INTO dm_conversation_id;
    END IF;

    -- Insert a direct message for the member
    INSERT INTO public.direct_message_messages (
      dm_id,
      user_id,
      content,
      attachment_url,
      attachment_name,
      attachment_type,
      attachment_size,
      workspace_id,
      broadcast_message_id -- Link back to the original broadcast message
    )
    VALUES (
      dm_conversation_id,
      sender_id, -- The sender of the broadcast message is also the sender of the DM
      NEW.content,
      NEW.attachment_url,
      NEW.attachment_name,
      NEW.attachment_type,
      NEW.attachment_size,
      broadcast_workspace_id,
      NEW.id -- Link to the broadcast_messages.id
    );
  END LOOP;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_default_channels_for_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  default_channel_name text;
BEGIN
  PERFORM pg_advisory_xact_lock(2026041601);

  FOREACH default_channel_name IN ARRAY ARRAY['general', 'ideas', 'support']
  LOOP
    INSERT INTO public.channels (name, description, is_private, created_by)
    SELECT
      default_channel_name,
      '',
      false,
      p_user_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.channels
      WHERE lower(name) = default_channel_name
        AND created_by = p_user_id
    );
  END LOOP;

  INSERT INTO public.channel_members (channel_id, user_id, role)
  SELECT
    c.id,
    p_user_id,
    'admin'
  FROM public.channels c
  WHERE lower(c.name) IN ('general', 'ideas', 'support')
    AND c.created_by = p_user_id
  ON CONFLICT (channel_id, user_id) DO UPDATE
  SET role = 'admin';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_default_channels_for_workspace_user(p_user_id uuid, p_workspace_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  default_channel_name text;
  resolved_channel_id uuid;
begin
  foreach default_channel_name in array array['general', 'ideas', 'support']
  loop
    insert into public.channels (
      name,
      description,
      is_private,
      created_by,
      workspace_id
    )
    values (
      default_channel_name,
      '',
      false,
      p_user_id,
      p_workspace_id
    )
    on conflict do nothing;

    select c.id
    into resolved_channel_id
    from public.channels c
    where c.workspace_id = p_workspace_id
      and c.created_by = p_user_id
      and lower(c.name) = default_channel_name
    limit 1;

    if resolved_channel_id is not null then
      insert into public.channel_members (channel_id, user_id, role)
      values (resolved_channel_id, p_user_id, 'admin')
      on conflict (channel_id, user_id) do update
      set role = 'admin';
    end if;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_personal_workspace_for_user(p_user_id uuid, p_workspace_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  workspace_record public.workspaces%rowtype;
  resolved_name text;
  resolved_slug text;
begin
  select *
  into workspace_record
  from public.workspaces
  where created_by = p_user_id
    and is_personal = true
  limit 1;

  if workspace_record.id is not null then
    return workspace_record.id;
  end if;

  select coalesce(
    p_workspace_name,
    nullif(trim(full_name), ''),
    split_part(email, '@', 1),
    'My'
  ) || '''s workspace'
  into resolved_name
  from public.profiles
  where id = p_user_id;

  resolved_slug :=
    public.slugify_workspace_name(resolved_name)
    || '-' || left(replace(p_user_id::text, '-', ''), 8);

  insert into public.workspaces (name, slug, created_by, is_personal)
  values (resolved_name, resolved_slug, p_user_id, true)
  returning *
  into workspace_record;

  insert into public.workspace_members (
    workspace_id,
    user_id,
    role,
    invited_by,
    is_active,
    removed_at
  )
  values (
    workspace_record.id,
    p_user_id,
    'owner',
    p_user_id,
    true,
    null
  )
  on conflict (workspace_id, user_id) do update
  set role = 'owner',
      invited_by = excluded.invited_by,
      is_active = true,
      removed_at = null;

  return workspace_record.id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_broadcast_sidebar_summaries(p_workspace_id uuid)
 RETURNS TABLE(id uuid, name text, created_at timestamp with time zone, latest_content text, latest_created_at timestamp with time zone, latest_user_id uuid, latest_attachment_name text, latest_attachment_type text, latest_is_deleted boolean, unread_count bigint, is_member boolean, is_admin boolean, archived_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.created_at,
    latest_bm.content AS latest_content,
    latest_bm.created_at AS latest_created_at,
    latest_bm.user_id AS latest_user_id,
    latest_bm.attachment_name AS latest_attachment_name,
    latest_bm.attachment_type AS latest_attachment_type,
    latest_bm.is_deleted AS latest_is_deleted,
    COALESCE(unread_messages.unread_count, 0) AS unread_count,
    TRUE AS is_member, -- User is always a member if they see it in sidebar
    (bm.role = 'admin') AS is_admin,
    ca.archived_at
  FROM public.broadcasts b
  JOIN public.broadcast_members bm ON b.id = bm.broadcast_id
  LEFT JOIN public.chat_archives ca ON b.id = ca.broadcast_id AND ca.user_id = current_user_id
  LEFT JOIN LATERAL (
    SELECT
      bm_inner.content,
      bm_inner.created_at,
      bm_inner.user_id,
      bm_inner.attachment_name,
      bm_inner.attachment_type,
      bm_inner.is_deleted
    FROM public.broadcast_messages bm_inner
    WHERE bm_inner.broadcast_id = b.id
    ORDER BY bm_inner.created_at DESC
    LIMIT 1
  ) latest_bm ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS unread_count
    FROM public.broadcast_messages bm_unread
    WHERE bm_unread.broadcast_id = b.id
      AND bm_unread.user_id <> current_user_id
      AND bm_unread.created_at > bm.last_read_at
  ) unread_messages ON true
  WHERE b.workspace_id = p_workspace_id
    AND bm.user_id = current_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_chat_detail_counts(p_channel_id uuid DEFAULT NULL::uuid, p_dm_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(bookmark_count bigint, pin_count bigint, todo_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  can_read_conversation boolean;
BEGIN
  IF p_channel_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.channel_members member
      WHERE member.channel_id = p_channel_id
        AND member.user_id = auth.uid()
    )
    INTO can_read_conversation;

    IF NOT can_read_conversation THEN
      RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      (
        SELECT count(*)::bigint
        FROM public.message_bookmarks bookmark
        JOIN public.messages message ON message.id = bookmark.message_id
        WHERE bookmark.user_id = auth.uid()
          AND message.channel_id = p_channel_id
      ) AS bookmark_count,
      (
        SELECT count(*)::bigint
        FROM public.pinned_messages pin
        WHERE pin.channel_id = p_channel_id
      ) AS pin_count,
      (
        SELECT count(*)::bigint
        FROM public.message_todos todo
        WHERE todo.channel_id = p_channel_id
      ) AS todo_count;
    RETURN;
  END IF;

  IF p_dm_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.direct_messages dm
      WHERE dm.id = p_dm_id
        AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid())
    )
    INTO can_read_conversation;

    IF NOT can_read_conversation THEN
      RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      (
        SELECT count(*)::bigint
        FROM public.message_bookmarks bookmark
        JOIN public.direct_message_messages message
          ON message.id = bookmark.message_id
        WHERE bookmark.user_id = auth.uid()
          AND message.dm_id = p_dm_id
      ) AS bookmark_count,
      (
        SELECT count(*)::bigint
        FROM public.pinned_messages pin
        WHERE pin.dm_id = p_dm_id
      ) AS pin_count,
      (
        SELECT count(*)::bigint
        FROM public.message_todos todo
        WHERE todo.dm_id = p_dm_id
      ) AS todo_count;
    RETURN;
  END IF;

  RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_chat_detail_counts(p_channel_id uuid DEFAULT NULL::uuid, p_dm_id uuid DEFAULT NULL::uuid, p_broadcast_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(bookmark_count bigint, pin_count bigint, todo_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  can_read_conversation boolean;
BEGIN
  IF p_channel_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.channel_members member
      WHERE member.channel_id = p_channel_id
        AND member.user_id = auth.uid()
    )
    INTO can_read_conversation;

    IF NOT can_read_conversation THEN
      RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      (
        SELECT count(*)::bigint
        FROM public.message_bookmarks bookmark
        JOIN public.messages message ON message.id = bookmark.message_id
        WHERE bookmark.user_id = auth.uid()
          AND message.channel_id = p_channel_id
      ) AS bookmark_count,
      (
        SELECT count(*)::bigint
        FROM public.pinned_messages pin
        WHERE pin.channel_id = p_channel_id
      ) AS pin_count,
      (
        SELECT count(*)::bigint
        FROM public.message_todos todo
        WHERE todo.channel_id = p_channel_id
      ) AS todo_count;
    RETURN;
  END IF;

  IF p_dm_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.direct_messages dm
      WHERE dm.id = p_dm_id
        AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid())
    )
    INTO can_read_conversation;

    IF NOT can_read_conversation THEN
      RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      (
        SELECT count(*)::bigint
        FROM public.message_bookmarks bookmark
        JOIN public.direct_message_messages message
          ON message.id = bookmark.message_id
        WHERE bookmark.user_id = auth.uid()
          AND message.dm_id = p_dm_id
      ) AS bookmark_count,
      (
        SELECT count(*)::bigint
        FROM public.pinned_messages pin
        WHERE pin.dm_id = p_dm_id
      ) AS pin_count,
      (
        SELECT count(*)::bigint
        FROM public.message_todos todo
        WHERE todo.dm_id = p_dm_id
      ) AS todo_count;
    RETURN;
  END IF;

  IF p_broadcast_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.broadcast_members bm
      WHERE bm.broadcast_id = p_broadcast_id
        AND bm.user_id = auth.uid()
    )
    INTO can_read_conversation;

    IF NOT can_read_conversation THEN
      RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
      (
        SELECT count(*)::bigint
        FROM public.message_bookmarks bookmark
        JOIN public.broadcast_messages message ON message.id = bookmark.message_id
        WHERE bookmark.user_id = auth.uid()
          AND message.broadcast_id = p_broadcast_id
      ) AS bookmark_count,
      (
        SELECT count(*)::bigint
        FROM public.pinned_messages pin
        WHERE pin.broadcast_id = p_broadcast_id
      ) AS pin_count,
      (
        SELECT count(*)::bigint
        FROM public.message_todos todo
        WHERE todo.broadcast_id = p_broadcast_id
      ) AS todo_count;
    RETURN;
  END IF;

  RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dm_sidebar_summaries(p_workspace_id uuid)
 RETURNS TABLE(id uuid, user1_id uuid, user2_id uuid, user1_last_read_at timestamp with time zone, user2_last_read_at timestamp with time zone, created_at timestamp with time zone, other_user_id uuid, other_email text, other_full_name text, other_avatar_url text, other_avatar_color text, other_is_signedin boolean, other_last_seen timestamp with time zone, latest_content text, latest_created_at timestamp with time zone, latest_user_id uuid, latest_attachment_name text, latest_attachment_type text, latest_is_deleted boolean, unread_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    dm.id,
    dm.user1_id,
    dm.user2_id,
    dm.user1_last_read_at,
    dm.user2_last_read_at,
    dm.created_at,
    other_profile.id AS other_user_id,
    other_profile.email AS other_email,
    other_profile.full_name AS other_full_name,
    other_profile.avatar_url AS other_avatar_url,
    other_profile.avatar_color AS other_avatar_color,
    other_profile.is_signedin AS other_is_signedin,
    other_profile.last_seen AS other_last_seen,
    latest_message.content AS latest_content,
    latest_message.created_at AS latest_created_at,
    latest_message.user_id AS latest_user_id,
    latest_message.attachment_name AS latest_attachment_name,
    latest_message.attachment_type AS latest_attachment_type,
    latest_message.is_deleted AS latest_is_deleted,
    COALESCE(unread_messages.unread_count, 0) AS unread_count
  FROM public.direct_messages dm
  JOIN public.profiles other_profile
    ON other_profile.id = CASE
      WHEN dm.user1_id = auth.uid() THEN dm.user2_id
      ELSE dm.user1_id
    END
  LEFT JOIN LATERAL (
    SELECT
      message.content,
      message.created_at,
      message.user_id,
      message.attachment_name,
      message.attachment_type,
      message.is_deleted
    FROM public.direct_message_messages message
    WHERE message.dm_id = dm.id
      AND message.thread_id IS NULL
    ORDER BY message.created_at DESC
    LIMIT 1
  ) latest_message ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS unread_count
    FROM public.direct_message_messages message
    WHERE message.dm_id = dm.id
      AND message.thread_id IS NULL
      AND message.user_id <> auth.uid()
      AND message.created_at > CASE
        WHEN dm.user1_id = auth.uid() THEN dm.user1_last_read_at
        ELSE dm.user2_last_read_at
      END
  ) unread_messages ON true
  WHERE dm.workspace_id = p_workspace_id
    AND (dm.user1_id = auth.uid() OR dm.user2_id = auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  color text;
  resolved_admin_user_id uuid;
  resolved_workspace_id uuid;
  admin_invite_token text;
  channel_invite_token text;
  resolved_name text;
  resolved_slug text;
begin
  color := 'hsl(' || floor(random() * 360) || ', 70%, 50%)';
  admin_invite_token := nullif(new.raw_user_meta_data->>'admin_invite_token', '');
  channel_invite_token := nullif(new.raw_user_meta_data->>'channel_invite_token', '');

  -- Always create/update profile first.
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_color,
    admin_user_id
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'User'),
    color,
    null
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name);

  begin
    if admin_invite_token is not null then
      select invited_by, workspace_id
      into resolved_admin_user_id, resolved_workspace_id
      from public.workspace_invites
      where invite_token = admin_invite_token
        and lower(invited_email) = lower(new.email)
        and accepted_at is null
        and expires_at > now()
      limit 1;

      if resolved_workspace_id is null then
        select invited_by, workspace_id
        into resolved_admin_user_id, resolved_workspace_id
        from public.admin_user_invites
        where invite_token = admin_invite_token
          and lower(invited_email) = lower(new.email)
          and accepted_at is null
          and expires_at > now()
        limit 1;
      end if;
    end if;

    if resolved_workspace_id is null and channel_invite_token is not null then
      select invited_by, workspace_id
      into resolved_admin_user_id, resolved_workspace_id
      from public.channel_invites
      where invite_token = channel_invite_token
        and lower(invited_email) = lower(new.email)
        and expires_at > now()
      limit 1;
    end if;

    update public.profiles
    set admin_user_id = resolved_admin_user_id
    where id = new.id
      and resolved_admin_user_id is not null;

    -- Normal signup: create personal workspace.
    if resolved_workspace_id is null then
      select coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1), 'My') || '''s workspace'
      into resolved_name
      from public.profiles
      where id = new.id;

      resolved_slug :=
        public.slugify_workspace_name(resolved_name)
        || '-' || left(replace(new.id::text, '-', ''), 8);

      insert into public.workspaces (name, slug, created_by, is_personal)
      values (resolved_name, resolved_slug, new.id, true)
      on conflict do nothing;

      select id
      into resolved_workspace_id
      from public.workspaces
      where created_by = new.id
        and is_personal = true
      limit 1;

      insert into public.workspace_members (workspace_id, user_id, role, invited_by, is_active, removed_at)
      values (resolved_workspace_id, new.id, 'owner', new.id, true, null)
      on conflict (workspace_id, user_id) do update
      set role = 'owner',
          is_active = true,
          removed_at = null;

      insert into public.channels (name, description, is_private, created_by, workspace_id)
      values
        ('general', '', false, new.id, resolved_workspace_id),
        ('ideas', '', false, new.id, resolved_workspace_id),
        ('support', '', false, new.id, resolved_workspace_id)
      on conflict do nothing;

      insert into public.channel_members (channel_id, user_id, role)
      select c.id, new.id, 'admin'
      from public.channels c
      where c.workspace_id = resolved_workspace_id
        and c.created_by = new.id
      on conflict (channel_id, user_id) do nothing;

    -- Invite signup: join existing workspace.
    else
      insert into public.workspace_members (workspace_id, user_id, role, invited_by, is_active, removed_at)
      values (resolved_workspace_id, new.id, 'member', resolved_admin_user_id, true, null)
      on conflict (workspace_id, user_id) do update
      set is_active = true,
          removed_at = null;

      insert into public.channel_members (channel_id, user_id, role)
      select c.id, new.id, 'member'
      from public.channels c
      where c.workspace_id = resolved_workspace_id
        and c.is_private = false
      on conflict (channel_id, user_id) do nothing;
    end if;

  exception when others then
    insert into public.signup_trigger_errors (user_id, email, error_message)
    values (new.id, new.email, sqlerrm);
  end;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid, p_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
      and wm.is_active = true
      and wm.removed_at is null
  );
$function$
;

CREATE OR REPLACE FUNCTION public.notify_channel_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    entity_id,
    actor_id,
    data
  )
  SELECT
    cm.user_id,
    CASE
      WHEN NEW.thread_id IS NOT NULL THEN 'reply'
      ELSE 'message'
    END,
    CASE
      WHEN NEW.thread_id IS NOT NULL THEN 'New reply'
      ELSE 'New message'
    END,
    NEW.content,
    NEW.id,
    NEW.user_id,
    jsonb_build_object(
      'channel_id', NEW.channel_id,
      'attachment_url', NEW.attachment_url,
      'thread_id', NEW.thread_id,
      'is_reply', NEW.thread_id IS NOT NULL
    )
  FROM channel_members cm
  JOIN profiles p ON p.id = cm.user_id
  WHERE cm.channel_id = NEW.channel_id
    AND cm.user_id != NEW.user_id
    AND (
      p.is_signedin = false
      OR p.last_seen IS NULL
      OR p.last_seen < NOW() - INTERVAL '90 seconds'
    );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_dm_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  recipient_id uuid;
BEGIN
  SELECT
    CASE
      WHEN dm.user1_id = NEW.user_id THEN dm.user2_id
      ELSE dm.user1_id
    END
  INTO recipient_id
  FROM direct_messages dm
  WHERE dm.id = NEW.dm_id;

  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    entity_id,
    actor_id,
    data
  )
  SELECT
    p.id,
    CASE
      WHEN NEW.thread_id IS NOT NULL THEN 'reply'
      ELSE 'message'
    END,
    CASE
      WHEN NEW.thread_id IS NOT NULL THEN 'New reply'
      ELSE 'New message'
    END,
    CASE
      WHEN NEW.attachment_url IS NOT NULL AND (NEW.content IS NULL OR NEW.content = '') 
        THEN 'Sent an attachment'
      ELSE NEW.content
    END,
    NEW.id,
    NEW.user_id,
    jsonb_build_object(
      'dm_id', NEW.dm_id,
      'recipient_id', recipient_id,
      'attachment_url', NEW.attachment_url,
      'attachment_type', NEW.attachment_type,
      'status', NEW.status,
      'thread_id', NEW.thread_id,
      'is_reply', NEW.thread_id IS NOT NULL
    )
  FROM profiles p
  WHERE p.id = recipient_id
    AND p.id != NEW.user_id
    AND NEW.deleted_at IS NULL
    AND (
      p.is_signedin = false
      OR p.last_seen IS NULL
      OR p.last_seen < NOW() - INTERVAL '40 seconds'
    );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_pin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  dm_recipient uuid;
BEGIN
  -- =========================
  -- CHANNEL PIN
  -- =========================
  IF NEW.channel_id IS NOT NULL THEN

    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      entity_id,
      actor_id,
      data
    )
    SELECT
      cm.user_id,
      'pin',
      'Message pinned',
      'A message was pinned',
      NEW.message_id,
      NEW.pinned_by,
      jsonb_build_object(
        'channel_id', NEW.channel_id,
        'message_id', NEW.message_id
      )
    FROM channel_members cm
    JOIN profiles p ON p.id = cm.user_id
    WHERE cm.channel_id = NEW.channel_id
      AND cm.user_id != NEW.pinned_by
      AND (
        p.is_signedin = false
        OR p.last_seen IS NULL
        OR p.last_seen < NOW() - INTERVAL '90 seconds'
      );

  END IF;

  -- =========================
  -- DM PIN
  -- =========================
  IF NEW.dm_id IS NOT NULL THEN

    SELECT
      CASE
        WHEN dm.user1_id = NEW.pinned_by THEN dm.user2_id
        ELSE dm.user1_id
      END
    INTO dm_recipient
    FROM direct_messages dm
    WHERE dm.id = NEW.dm_id;

    IF dm_recipient IS NOT NULL AND dm_recipient != NEW.pinned_by THEN

      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        entity_id,
        actor_id,
        data
      )
      SELECT
        p.id,
        'pin',
        'Message pinned',
        'A message was pinned',
        NEW.message_id,
        NEW.pinned_by,
        jsonb_build_object(
          'dm_id', NEW.dm_id,
          'recipient_id', dm_recipient,
          'message_id', NEW.message_id
        )
      FROM profiles p
      WHERE p.id = dm_recipient
        AND (
          p.is_signedin = false
          OR p.last_seen IS NULL
          OR p.last_seen < NOW() - INTERVAL '40 seconds'
        );

    END IF;

  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  message_owner uuid;
  channel_id uuid;
  dm_id uuid;
  recipient_id uuid;
BEGIN
  -- =========================
  -- Try channel message
  -- =========================
  SELECT m.user_id, m.channel_id
  INTO message_owner, channel_id
  FROM messages m
  WHERE m.id = NEW.message_id;

  -- =========================
  -- If not found, try DM message
  -- =========================
  IF message_owner IS NULL THEN
    SELECT dm.user_id, dm.dm_id
    INTO message_owner, dm_id
    FROM direct_message_messages dm
    WHERE dm.id = NEW.message_id;

    -- Resolve recipient for DM
    IF dm_id IS NOT NULL THEN
      SELECT
        CASE
          WHEN d.user1_id = NEW.user_id THEN d.user2_id
          ELSE d.user1_id
        END
      INTO recipient_id
      FROM direct_messages d
      WHERE d.id = dm_id;
    END IF;
  END IF;

  -- =========================
  -- Prevent invalid/self notifications
  -- =========================
  IF message_owner IS NULL OR message_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- =========================
  -- Insert notification
  -- =========================
  INSERT INTO notifications (
    user_id,
    type,
    title,
    body,
    entity_id,
    actor_id,
    data
  )
  SELECT
    p.id,
    'reaction',
    'New reaction',
    NEW.emoji,
    NEW.message_id,
    NEW.user_id,
    jsonb_build_object(
      'message_id', NEW.message_id,
      'channel_id', channel_id,
      'dm_id', dm_id,
      'recipient_id', recipient_id,
      'emoji', NEW.emoji
    )
  FROM profiles p
  WHERE p.id = message_owner
    AND (
      p.is_signedin = false
      OR p.last_seen IS NULL
      OR p.last_seen < NOW() - INTERVAL '40 seconds'
    );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_removed_workspace_users(p_user_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  acting_admin_id uuid := auth.uid();
BEGIN
  IF acting_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles admin_profile
    WHERE admin_profile.id = acting_admin_id
      AND admin_profile.admin_user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Only workspace admins can restore users';
  END IF;

  UPDATE public.profiles
  SET admin_user_id = acting_admin_id,
      deleted_by_admin_user_id = NULL,
      deleted_from_admin_at = NULL
  WHERE id = ANY(p_user_ids)
    AND deleted_by_admin_user_id = acting_admin_id;

  INSERT INTO public.channel_members (channel_id, user_id, role)
  SELECT
    c.id,
    p.id,
    'member'
  FROM public.profiles p
  JOIN public.channels c
    ON c.created_by = acting_admin_id
   AND c.is_private = false
  WHERE p.id = ANY(p_user_ids)
    AND p.admin_user_id = acting_admin_id
    AND p.deleted_by_admin_user_id IS NULL
  ON CONFLICT (channel_id, user_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_broadcast_messages_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_message_todos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.slugify_workspace_name(input text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  base_slug text;
begin
  base_slug := lower(regexp_replace(coalesce(trim(input), ''), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');

  if base_slug = '' then
    base_slug := 'workspace';
  end if;

  return base_slug;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_admin_public_channels_for_user(p_user_id uuid, p_admin_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS NULL OR p_admin_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.channel_members (channel_id, user_id, role)
  SELECT
    c.id,
    p_user_id,
    'member'
  FROM public.channels c
  JOIN public.profiles p
    ON p.id = p_user_id
  WHERE c.created_by = p_admin_user_id
    AND c.is_private = false
    AND p.admin_user_id = p_admin_user_id
    AND p.deleted_by_admin_user_id IS DISTINCT FROM p_admin_user_id
  ON CONFLICT (channel_id, user_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_managed_users_for_new_public_channel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.created_by IS NOT NULL AND NEW.is_private = false THEN
    INSERT INTO public.channel_members (channel_id, user_id, role)
    SELECT
      NEW.id,
      p.id,
      'member'
    FROM public.profiles p
    WHERE p.admin_user_id = NEW.created_by
      AND p.deleted_by_admin_user_id IS DISTINCT FROM NEW.created_by
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_chat_detail_entries_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_last_read()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE channel_members
  SET last_read_at = now()
  WHERE channel_id = NEW.channel_id
  AND user_id = NEW.user_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_reply_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.thread_id IS NOT NULL THEN
    UPDATE messages SET reply_count = reply_count + 1 WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' AND OLD.thread_id IS NOT NULL THEN
    UPDATE messages SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.thread_id;
  END IF;
  RETURN NEW;
END;
$function$
;


  create policy "Admins can create user invites"
  on "public"."admin_user_invites"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = invited_by) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.admin_user_id IS NULL))))));



  create policy "Admins can delete pending user invites"
  on "public"."admin_user_invites"
  as permissive
  for delete
  to authenticated
using (((auth.uid() = invited_by) AND (accepted_at IS NULL)));



  create policy "Invite actors can update user invites"
  on "public"."admin_user_invites"
  as permissive
  for update
  to authenticated
using (((auth.uid() = invited_by) OR (lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))))
with check (((auth.uid() = invited_by) OR (lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))));



  create policy "Invite actors can view user invites"
  on "public"."admin_user_invites"
  as permissive
  for select
  to authenticated
using (((auth.uid() = invited_by) OR (lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))));



  create policy "Broadcast admins can add members"
  on "public"."broadcast_members"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = broadcast_members.broadcast_id) AND (bm.user_id = auth.uid()) AND (bm.role = 'admin'::text)))));



  create policy "Broadcast admins can remove members"
  on "public"."broadcast_members"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = broadcast_members.broadcast_id) AND (bm.user_id = auth.uid()) AND (bm.role = 'admin'::text)))));



  create policy "Broadcast admins can update members"
  on "public"."broadcast_members"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = broadcast_members.broadcast_id) AND (bm.user_id = auth.uid()) AND (bm.role = 'admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = broadcast_members.broadcast_id) AND (bm.user_id = auth.uid()) AND (bm.role = 'admin'::text)))));



  create policy "Broadcast members can view their memberships"
  on "public"."broadcast_members"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = broadcast_members.broadcast_id) AND (bm.user_id = auth.uid()) AND (bm.role = 'admin'::text))))));



  create policy "Broadcast members can insert messages"
  on "public"."broadcast_messages"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = broadcast_messages.broadcast_id) AND (bm.user_id = auth.uid()))))));



  create policy "Broadcast members can view messages"
  on "public"."broadcast_messages"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = broadcast_messages.broadcast_id) AND (bm.user_id = auth.uid())))));



  create policy "Broadcast message owners can delete messages"
  on "public"."broadcast_messages"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "Broadcast message owners can update messages"
  on "public"."broadcast_messages"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "Workspace members can view broadcasts"
  on "public"."broadcasts"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = broadcasts.id) AND (bm.user_id = auth.uid())))));



  create policy "Users can hide their own channels"
  on "public"."channel_hidden_memberships"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can unhide their own channels"
  on "public"."channel_hidden_memberships"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can view their hidden channels"
  on "public"."channel_hidden_memberships"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Channel admins can create invites"
  on "public"."channel_invites"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = invited_by) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = channel_invites.channel_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'admin'::text))))));



  create policy "Channel admins can delete channel invites"
  on "public"."channel_invites"
  as permissive
  for delete
  to authenticated
using (((auth.uid() = invited_by) OR (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = channel_invites.channel_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'admin'::text))))));



  create policy "Invite actors can update channel invites"
  on "public"."channel_invites"
  as permissive
  for update
  to authenticated
using (((lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) OR (auth.uid() = invited_by) OR (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = channel_invites.channel_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'admin'::text))))))
with check (((lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) OR (auth.uid() = invited_by) OR (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = channel_invites.channel_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'admin'::text))))));



  create policy "Invite actors can view channel invites"
  on "public"."channel_invites"
  as permissive
  for select
  to authenticated
using (((lower(invited_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) OR (auth.uid() = invited_by) OR (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = channel_invites.channel_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'admin'::text))))));



  create policy "Authenticated users can view channel members"
  on "public"."channel_members"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Channel creators can update members"
  on "public"."channel_members"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.channels
  WHERE ((channels.id = channel_members.channel_id) AND (channels.created_by = auth.uid())))));



  create policy "Users can join admin public channels creators can invite and in"
  on "public"."channel_members"
  as permissive
  for insert
  to authenticated
with check ((((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM (public.channels ch
     JOIN public.profiles acting_user ON ((acting_user.id = auth.uid())))
  WHERE ((ch.id = channel_members.channel_id) AND (acting_user.deleted_by_admin_user_id IS DISTINCT FROM ch.created_by) AND (((ch.created_by = auth.uid()) AND (acting_user.admin_user_id IS NULL)) OR ((ch.is_private = false) AND (acting_user.admin_user_id = ch.created_by))))))) OR (EXISTS ( SELECT 1
   FROM (public.channels ch
     JOIN public.profiles target_user ON ((target_user.id = channel_members.user_id)))
  WHERE ((ch.id = channel_members.channel_id) AND (ch.created_by = auth.uid()) AND (target_user.deleted_by_admin_user_id IS DISTINCT FROM auth.uid()) AND ((target_user.id = auth.uid()) OR (target_user.admin_user_id = auth.uid()))))) OR ((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM ((public.channel_invites ci
     JOIN public.channels ch ON ((ch.id = ci.channel_id)))
     JOIN public.profiles acting_user ON ((acting_user.id = auth.uid())))
  WHERE ((ci.channel_id = channel_members.channel_id) AND (ci.accepted_at IS NULL) AND (ci.expires_at > now()) AND (lower(ci.invited_email) = lower(COALESCE(acting_user.email, ''::text))) AND (acting_user.deleted_by_admin_user_id IS DISTINCT FROM ch.created_by)))))));



  create policy "Users can leave or be removed"
  on "public"."channel_members"
  as permissive
  for delete
  to authenticated
using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.channels
  WHERE ((channels.id = channel_members.channel_id) AND (channels.created_by = auth.uid()))))));



  create policy "Users can remove themselves from channels"
  on "public"."channel_members"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "Users can update their own channel membership read state"
  on "public"."channel_members"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Channel creators can update their channels"
  on "public"."channels"
  as permissive
  for update
  to authenticated
using ((created_by = auth.uid()))
with check ((created_by = auth.uid()));



  create policy "Workspace admins can create channels"
  on "public"."channels"
  as permissive
  for insert
  to authenticated
with check (((created_by = auth.uid()) AND public.is_workspace_member(workspace_id, auth.uid())));



  create policy "Workspace members can view workspace channels"
  on "public"."channels"
  as permissive
  for select
  to authenticated
using ((public.is_workspace_member(workspace_id, auth.uid()) AND ((is_private = false) OR (created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = channels.id) AND (cm.user_id = auth.uid())))))));



  create policy "Users can archive their own chats"
  on "public"."chat_archives"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can unarchive their own chats"
  on "public"."chat_archives"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can update their own archived chats"
  on "public"."chat_archives"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view their archived chats"
  on "public"."chat_archives"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can create own chat details"
  on "public"."chat_detail_entries"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can delete own chat details"
  on "public"."chat_detail_entries"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can update own chat details"
  on "public"."chat_detail_entries"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view own chat details"
  on "public"."chat_detail_entries"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can delete own DM messages"
  on "public"."direct_message_messages"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can update own DM messages"
  on "public"."direct_message_messages"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Workspace DM participants can create messages"
  on "public"."direct_message_messages"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = user_id) AND public.is_workspace_member(workspace_id, auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = direct_message_messages.dm_id) AND (dm.workspace_id = direct_message_messages.workspace_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))));



  create policy "Workspace DM participants can view messages"
  on "public"."direct_message_messages"
  as permissive
  for select
  to authenticated
using ((public.is_workspace_member(workspace_id, auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = direct_message_messages.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))));



  create policy "Participants can update their own direct message read state"
  on "public"."direct_messages"
  as permissive
  for update
  to authenticated
using (((auth.uid() = user1_id) OR (auth.uid() = user2_id)))
with check (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));



  create policy "Workspace DM participants can view DMs"
  on "public"."direct_messages"
  as permissive
  for select
  to authenticated
using (((workspace_id IS NOT NULL) AND public.is_workspace_member(workspace_id, auth.uid()) AND ((auth.uid() = user1_id) OR (auth.uid() = user2_id))));



  create policy "Workspace members can create participant DMs"
  on "public"."direct_messages"
  as permissive
  for insert
  to authenticated
with check ((((auth.uid() = user1_id) OR (auth.uid() = user2_id)) AND public.is_workspace_member(workspace_id, user1_id) AND public.is_workspace_member(workspace_id, user2_id)));



  create policy "Users can upload files"
  on "public"."files"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = uploaded_by));



  create policy "Users can view files in their channels"
  on "public"."files"
  as permissive
  for select
  to authenticated
using (((channel_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.channel_members
  WHERE ((channel_members.channel_id = files.channel_id) AND (channel_members.user_id = auth.uid()))))));



  create policy "Users can create their own bookmarks"
  on "public"."message_bookmarks"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can delete their own bookmarks"
  on "public"."message_bookmarks"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can update their own bookmarks"
  on "public"."message_bookmarks"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view their own bookmarks"
  on "public"."message_bookmarks"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can create forwards"
  on "public"."message_forwards"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = forwarded_by));



  create policy "Users can view their own forwards"
  on "public"."message_forwards"
  as permissive
  for select
  to authenticated
using ((auth.uid() = forwarded_by));



  create policy "Users can create mentions"
  on "public"."message_mentions"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Users can view mentions of themselves"
  on "public"."message_mentions"
  as permissive
  for select
  to authenticated
using (((mentioned_user_id = auth.uid()) OR (mention_type = ANY (ARRAY['channel'::text, 'everyone'::text]))));



  create policy "Users can add their own reactions"
  on "public"."message_reactions"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can delete own message reactions"
  on "public"."message_reactions"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "Users can insert message reactions"
  on "public"."message_reactions"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) AND (((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = message_reactions.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = message_reactions.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = message_reactions.broadcast_id) AND (bm.user_id = auth.uid()))))))));



  create policy "Users can remove their own reactions"
  on "public"."message_reactions"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can view message reactions"
  on "public"."message_reactions"
  as permissive
  for select
  to authenticated
using ((((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = message_reactions.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = message_reactions.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = message_reactions.broadcast_id) AND (bm.user_id = auth.uid())))))));



  create policy "Users can view reactions in their channels"
  on "public"."message_reactions"
  as permissive
  for select
  to authenticated
using (((message_id IN ( SELECT m.id
   FROM (public.messages m
     JOIN public.channel_members cm ON ((cm.channel_id = m.channel_id)))
  WHERE (cm.user_id = auth.uid()))) OR (message_id IN ( SELECT dm.id
   FROM (public.direct_message_messages dm
     JOIN public.direct_messages d ON ((d.id = dm.dm_id)))
  WHERE ((d.user1_id = auth.uid()) OR (d.user2_id = auth.uid()))))));



  create policy "Users can create their own read receipts"
  on "public"."message_read_receipts"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can view read receipts for their messages"
  on "public"."message_read_receipts"
  as permissive
  for select
  to authenticated
using (((message_id IN ( SELECT messages.id
   FROM public.messages
  WHERE (messages.user_id = auth.uid()))) OR (message_id IN ( SELECT direct_message_messages.id
   FROM public.direct_message_messages
  WHERE (direct_message_messages.user_id = auth.uid()))) OR (user_id = auth.uid())));



  create policy "Chat participants can create message todos"
  on "public"."message_todos"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = user_id) AND (((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = message_todos.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = message_todos.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = message_todos.broadcast_id) AND (bm.user_id = auth.uid()))))))));



  create policy "Chat participants can delete message todos"
  on "public"."message_todos"
  as permissive
  for delete
  to authenticated
using ((((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = message_todos.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = message_todos.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = message_todos.broadcast_id) AND (bm.user_id = auth.uid())))))));



  create policy "Chat participants can update message todos"
  on "public"."message_todos"
  as permissive
  for update
  to authenticated
using ((((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = message_todos.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = message_todos.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = message_todos.broadcast_id) AND (bm.user_id = auth.uid())))))))
with check ((((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = message_todos.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = message_todos.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = message_todos.broadcast_id) AND (bm.user_id = auth.uid())))))));



  create policy "Chat participants can view message todos"
  on "public"."message_todos"
  as permissive
  for select
  to authenticated
using ((((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = message_todos.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = message_todos.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = message_todos.broadcast_id) AND (bm.user_id = auth.uid())))))));



  create policy "Users can delete own messages"
  on "public"."messages"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Users can update own messages"
  on "public"."messages"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Workspace channel members can create messages"
  on "public"."messages"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = user_id) AND public.is_workspace_member(workspace_id, auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = messages.channel_id) AND (cm.user_id = auth.uid()))))));



  create policy "Workspace channel members can view messages"
  on "public"."messages"
  as permissive
  for select
  to authenticated
using ((public.is_workspace_member(workspace_id, auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = messages.channel_id) AND (cm.user_id = auth.uid()))))));



  create policy "Users can update their own notifications"
  on "public"."notifications"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view their own notifications"
  on "public"."notifications"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Chat participants can pin messages"
  on "public"."pinned_messages"
  as permissive
  for insert
  to authenticated
with check (((pinned_by = auth.uid()) AND (((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = pinned_messages.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = pinned_messages.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = pinned_messages.broadcast_id) AND (bm.user_id = auth.uid()))))))));



  create policy "Chat participants can unpin messages"
  on "public"."pinned_messages"
  as permissive
  for delete
  to authenticated
using (((pinned_by = auth.uid()) AND (((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = pinned_messages.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = pinned_messages.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = pinned_messages.broadcast_id) AND (bm.user_id = auth.uid()))))))));



  create policy "Chat participants can view pinned messages"
  on "public"."pinned_messages"
  as permissive
  for select
  to authenticated
using ((((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = pinned_messages.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = pinned_messages.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = pinned_messages.broadcast_id) AND (bm.user_id = auth.uid())))))));



  create policy "Users can unpin messages"
  on "public"."pinned_messages"
  as permissive
  for delete
  to authenticated
using (((channel_id IN ( SELECT channel_members.channel_id
   FROM public.channel_members
  WHERE (channel_members.user_id = auth.uid()))) OR (dm_id IN ( SELECT direct_messages.id
   FROM public.direct_messages
  WHERE ((direct_messages.user1_id = auth.uid()) OR (direct_messages.user2_id = auth.uid()))))));



  create policy "Users can view pinned messages in their channels"
  on "public"."pinned_messages"
  as permissive
  for select
  to authenticated
using (((channel_id IN ( SELECT channel_members.channel_id
   FROM public.channel_members
  WHERE (channel_members.user_id = auth.uid()))) OR (dm_id IN ( SELECT direct_messages.id
   FROM public.direct_messages
  WHERE ((direct_messages.user1_id = auth.uid()) OR (direct_messages.user2_id = auth.uid()))))));



  create policy "Users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "Users can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow all operations for authenticated users"
  on "public"."push_subscriptions"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Users can create typing indicators"
  on "public"."typing_indicators"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users can delete own typing indicators"
  on "public"."typing_indicators"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "Users can insert typing indicators"
  on "public"."typing_indicators"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) AND (((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = typing_indicators.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = typing_indicators.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = typing_indicators.broadcast_id) AND (bm.user_id = auth.uid()))))))));



  create policy "Users can view typing indicators in their channels"
  on "public"."typing_indicators"
  as permissive
  for select
  to authenticated
using ((((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members
  WHERE ((channel_members.channel_id = typing_indicators.channel_id) AND (channel_members.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages
  WHERE ((direct_messages.id = typing_indicators.dm_id) AND ((direct_messages.user1_id = auth.uid()) OR (direct_messages.user2_id = auth.uid()))))))));



  create policy "Users can view typing indicators"
  on "public"."typing_indicators"
  as permissive
  for select
  to authenticated
using ((((channel_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.channel_members cm
  WHERE ((cm.channel_id = typing_indicators.channel_id) AND (cm.user_id = auth.uid()))))) OR ((dm_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.direct_messages dm
  WHERE ((dm.id = typing_indicators.dm_id) AND ((dm.user1_id = auth.uid()) OR (dm.user2_id = auth.uid())))))) OR ((broadcast_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.broadcast_members bm
  WHERE ((bm.broadcast_id = typing_indicators.broadcast_id) AND (bm.user_id = auth.uid())))))));



  create policy "Workspace members can view memberships"
  on "public"."workspace_members"
  as permissive
  for select
  to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));



  create policy "Workspace members can view workspaces"
  on "public"."workspaces"
  as permissive
  for select
  to authenticated
using (public.is_workspace_member(id, auth.uid()));


CREATE TRIGGER on_broadcast_message_created AFTER INSERT ON public.broadcast_messages FOR EACH ROW EXECUTE FUNCTION public.create_dm_messages_for_broadcast_members();

CREATE TRIGGER set_broadcast_messages_updated_at BEFORE UPDATE ON public.broadcast_messages FOR EACH ROW EXECUTE FUNCTION public.set_broadcast_messages_updated_at();

CREATE TRIGGER channel_member_system_message_trigger AFTER INSERT OR DELETE ON public.channel_members FOR EACH ROW EXECUTE FUNCTION public.create_channel_member_system_message();

CREATE TRIGGER sync_managed_users_for_new_public_channel_trigger AFTER INSERT ON public.channels FOR EACH ROW EXECUTE FUNCTION public.sync_managed_users_for_new_public_channel();

CREATE TRIGGER update_chat_detail_entries_updated_at_trigger BEFORE UPDATE ON public.chat_detail_entries FOR EACH ROW EXECUTE FUNCTION public.update_chat_detail_entries_updated_at();

CREATE TRIGGER on_dm_message_created AFTER INSERT ON public.direct_message_messages FOR EACH ROW EXECUTE FUNCTION public.notify_dm_user();

CREATE TRIGGER send_on_push_dms AFTER INSERT ON public.direct_message_messages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://wspowzteoalbbvxjwrmr.supabase.co/functions/v1/send-push', 'POST', '{"Content-type":"application/json"}', '{}', '5000');

CREATE TRIGGER on_reaction_added AFTER INSERT ON public.message_reactions FOR EACH ROW EXECUTE FUNCTION public.notify_reaction();

CREATE TRIGGER send_push_on_message_reactions AFTER INSERT ON public.message_reactions FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://wspowzteoalbbvxjwrmr.supabase.co/functions/v1/send-push', 'POST', '{"Content-type":"application/json"}', '{}', '5000');

CREATE TRIGGER set_message_todos_updated_at BEFORE UPDATE ON public.message_todos FOR EACH ROW EXECUTE FUNCTION public.set_message_todos_updated_at();

CREATE TRIGGER on_message_created AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_channel_members();

CREATE TRIGGER send_push_on_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://wspowzteoalbbvxjwrmr.supabase.co/functions/v1/send-push', 'POST', '{"Content-type":"application/json"}', '{}', '5000');

CREATE TRIGGER update_message_reply_count AFTER INSERT OR DELETE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_reply_count();

CREATE TRIGGER on_message_pinned AFTER INSERT ON public.pinned_messages FOR EACH ROW EXECUTE FUNCTION public.notify_pin();

CREATE TRIGGER send_push_on_pinned_message AFTER INSERT ON public.pinned_messages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://wspowzteoalbbvxjwrmr.supabase.co/functions/v1/send-push', 'POST', '{"Content-type":"application/json"}', '{}', '5000');


  create policy "Allow uploads"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (true);



  create policy "Authenticated users can upload files"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete own files"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can view files"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'files'::text));



