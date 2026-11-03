-- Private storage for conversation attachments and voice messages.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'message-media',
  'message-media',
  false,
  26214400,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime',
    'audio/webm','audio/mp4','audio/mpeg','audio/ogg'
  ]
)
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "EMi message media participants can read" on storage.objects;
create policy "EMi message media participants can read" on storage.objects
for select to authenticated
using (
  bucket_id='message-media'
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id::text=split_part(name,'/',1)
      and cp.user_id=(select auth.uid())
  )
);

drop policy if exists "EMi message media participants can upload" on storage.objects;
create policy "EMi message media participants can upload" on storage.objects
for insert to authenticated
with check (
  bucket_id='message-media'
  and split_part(name,'/',2)=(select auth.uid())::text
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id::text=split_part(name,'/',1)
      and cp.user_id=(select auth.uid())
  )
);

drop policy if exists "EMi message media owners can delete" on storage.objects;
create policy "EMi message media owners can delete" on storage.objects
for delete to authenticated
using (
  bucket_id='message-media'
  and split_part(name,'/',2)=(select auth.uid())::text
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id::text=split_part(name,'/',1)
      and cp.user_id=(select auth.uid())
  )
);
