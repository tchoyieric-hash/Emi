-- Allow authenticated owners to delete only their own EMi professional directory profile.
-- This matches the ownership model already used by the INSERT and UPDATE policies.
create policy "Users can delete their own professional profile"
on public.elite_directory_profiles
for delete
to authenticated
using ((select auth.uid()) = user_id);
