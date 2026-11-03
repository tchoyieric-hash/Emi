-- Restrict story and legacy WhatsApp media uploads to image/video files.
-- Keep post-media unchanged: it also stores voice messages and phone-selected audio.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
where id in ('story-media', 'emi_media');
