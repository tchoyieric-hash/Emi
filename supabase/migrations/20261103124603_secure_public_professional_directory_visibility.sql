-- Public directory visibility is enforced at the database boundary.
-- Owners can always read their own profiles, including drafts/private profiles.
-- Anonymous and other signed-in users can only read published public profiles.
drop policy if exists "Published professional profiles are viewable"
  on public.elite_directory_profiles;

create policy "Public directory profiles and owners can view profiles"
  on public.elite_directory_profiles
  for select
  to anon, authenticated
  using (
    (select auth.uid()) = user_id
    or (
      published = true
      and (visibility = 'public' or visibility is null)
    )
  );
