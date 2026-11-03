-- Send an in-app and push notification to the owner whenever a new order is created.
alter table public.notifications
  add column if not exists order_id uuid references public.orders(id) on delete cascade;

create unique index if not exists notifications_order_received_once_idx
  on public.notifications (recipient_id, order_id, type)
  where order_id is not null and type = 'order_received';

create or replace function public.notify_business_owner_new_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_business_name text;
  v_product_name text;
  v_message text;
begin
  select b.owner_id, b.name into v_owner_id, v_business_name
  from public.businesses b where b.id = new.business_id;

  if v_owner_id is null or v_owner_id = new.buyer_id then return new; end if;

  select p.name into v_product_name
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  where oi.order_id = new.id
  order by oi.created_at limit 1;

  v_message := 'Nouvelle commande'
    || case when v_product_name is not null then ' : ' || v_product_name else '' end
    || ' · ' || to_char(new.subtotal, 'FM999G999G999G990') || ' ' || coalesce(new.currency, 'XAF')
    || ' pour ' || coalesce(v_business_name, 'ta boutique') || '.';

  insert into public.notifications (recipient_id, actor_id, type, message, is_read, order_id)
  values (v_owner_id, new.buyer_id, 'order_received', v_message, false, new.id)
  on conflict (recipient_id, order_id, type)
    where order_id is not null and type = 'order_received' do nothing;
  return new;
end;
$$;

revoke all on function public.notify_business_owner_new_order() from public, anon, authenticated;

drop trigger if exists orders_notify_business_owner on public.orders;
create trigger orders_notify_business_owner
after insert on public.orders for each row
execute function public.notify_business_owner_new_order();

create or replace function public.dispatch_emi_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare webhook_secret text;
begin
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets where name = 'emi_webhook_secret' limit 1;
  if webhook_secret is null then
    raise warning 'EMi push webhook secret is missing from Vault';
    return new;
  end if;
  perform net.http_post(
    url := 'https://sygzppmhenpemunacpfn.supabase.co/functions/v1/emi-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-emi-webhook-secret', webhook_secret),
    body := jsonb_build_object('type', 'INSERT', 'table', 'notifications',
      'record', jsonb_build_object('id', new.id, 'recipient_id', new.recipient_id,
        'actor_id', new.actor_id, 'type', new.type, 'message', new.message,
        'post_id', new.post_id, 'story_id', new.story_id, 'order_id', new.order_id)),
    timeout_milliseconds := 5000
  );
  return new;
end;
$function$;
