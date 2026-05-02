begin;

-- Remove the bad unique constraint
alter table public.chat_archives
  drop constraint if exists chat_archives_unique_chat;

-- Delete duplicate channel archives, keeping the newest one
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, channel_id
      order by archived_at desc, id desc
    ) as rn
  from public.chat_archives
  where channel_id is not null
)
delete from public.chat_archives a
using ranked r
where a.id = r.id
  and r.rn > 1;

-- Delete duplicate DM archives, keeping the newest one
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, dm_id
      order by archived_at desc, id desc
    ) as rn
  from public.chat_archives
  where dm_id is not null
)
delete from public.chat_archives a
using ranked r
where a.id = r.id
  and r.rn > 1;

-- Delete duplicate broadcast archives, keeping the newest one
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, broadcast_id
      order by archived_at desc, id desc
    ) as rn
  from public.chat_archives
  where broadcast_id is not null
)
delete from public.chat_archives a
using ranked r
where a.id = r.id
  and r.rn > 1;

-- Add proper unique constraints
alter table public.chat_archives
  drop constraint if exists chat_archives_unique_channel;

alter table public.chat_archives
  add constraint chat_archives_unique_channel unique (user_id, channel_id);

alter table public.chat_archives
  drop constraint if exists chat_archives_unique_dm;

alter table public.chat_archives
  add constraint chat_archives_unique_dm unique (user_id, dm_id);

alter table public.chat_archives
  drop constraint if exists chat_archives_unique_broadcast;

alter table public.chat_archives
  add constraint chat_archives_unique_broadcast unique (user_id, broadcast_id);

commit;
