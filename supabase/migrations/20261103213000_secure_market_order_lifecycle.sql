drop policy if exists "Buyers create orders" on public.orders;
drop policy if exists "Buyers add order items" on public.order_items;
drop policy if exists "Business owners update orders" on public.orders;

create or replace function public.emi_update_order_status(p_order_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_status not in ('confirmed','preparing','shipped','delivered') then
    raise exception 'INVALID_STATUS';
  end if;

  select o.* into v_order
  from public.orders o
  join public.businesses b on b.id = o.business_id
  where o.id = p_order_id and b.owner_id = v_user
  for update of o;

  if not found then raise exception 'NOT_AUTHORIZED'; end if;

  if not (
    (v_order.status = 'pending' and p_status = 'confirmed') or
    (v_order.status = 'confirmed' and p_status = 'preparing') or
    (v_order.status = 'preparing' and p_status = 'shipped') or
    (v_order.status = 'shipped' and p_status = 'delivered')
  ) then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  update public.orders
  set status = p_status, updated_at = now()
  where id = p_order_id;

  return true;
end;
$function$;

revoke all on function public.emi_create_order(jsonb,text) from public, anon;
grant execute on function public.emi_create_order(jsonb,text) to authenticated;

revoke all on function public.emi_cancel_order(uuid) from public, anon;
grant execute on function public.emi_cancel_order(uuid) to authenticated;

revoke all on function public.emi_update_order_status(uuid,text) from public, anon;
grant execute on function public.emi_update_order_status(uuid,text) to authenticated;
