-- Private storage for direct and group conversation attachments.
-- Object path: <conversation_id>/<uploader_user_id>/<filename>
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('message-media','message-media',false,26214400,array[
  'image/jpeg','image/png','image/webp','image/gif',
  'video/mp4','video/webm','video/quicktime',
  'audio/webm','audio/mp4','audio/mpeg','audio/ogg'
])
on conflict (id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Conversation members can read private message media" on storage.objects;
drop policy if exists "Conversation members can upload their own message media" on storage.objects;
drop policy if exists "Conversation members can delete their own message media" on storage.objects;

create policy "Conversation members can read private message media"
on storage.objects for select to authenticated
using (
  bucket_id='message-media'
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id::text = (storage.foldername(name))[1]
      and cp.user_id = (select auth.uid())
  )
);

create policy "Conversation members can upload their own message media"
on storage.objects for insert to authenticated
with check (
  bucket_id='message-media'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id::text = (storage.foldername(name))[1]
      and cp.user_id = (select auth.uid())
  )
);

create policy "Conversation members can delete their own message media"
on storage.objects for delete to authenticated
using (
  bucket_id='message-media'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id::text = (storage.foldername(name))[1]
      and cp.user_id = (select auth.uid())
  )
);
