drop policy if exists "senders can edit own messages" on public.messages;
create policy "senders can edit own messages"
on public.messages
for update
to authenticated
using (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = (select auth.uid())
  )
)
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = messages.conversation_id
      and cp.user_id = (select auth.uid())
  )
);