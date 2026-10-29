-- Add story-linked notifications for reactions on EMi stories.
alter table public.notifications
  add column if not exists story_id uuid references public.stories(id) on delete cascade;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type = any (array['like','comment','follow','mention','message','system','story_reaction']::text[]));

create index if not exists notifications_story_id_idx
  on public.notifications(story_id)
  where story_id is not null;
