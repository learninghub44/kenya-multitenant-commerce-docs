-- Expire abandoned public-checkout reservations. Cleanup runs transactionally before
-- each new pending order for that tenant, so stale reservations cannot block stock forever.
alter table public.orders
  add column if not exists reservation_expires_at timestamptz not null default (now() + interval '30 minutes');

create or replace function public.release_expired_reservations_for_tenant(p_tenant_id uuid)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  expired_order record;
  order_line record;
  main_location uuid;
  released_count integer := 0;
begin
  select l.id into main_location from public.inventory_locations l
  where l.tenant_id=p_tenant_id and l.code='MAIN' and l.active;
  if main_location is null then return 0; end if;

  for expired_order in
    select o.id from public.orders o
    where o.tenant_id=p_tenant_id and o.status='pending' and o.payment_status='pending'
      and o.reservation_expires_at <= now()
    order by o.reservation_expires_at
    for update
  loop
    for order_line in
      select oi.variant_id, sum(oi.quantity)::integer as quantity
      from public.order_items oi
      where oi.tenant_id=p_tenant_id and oi.order_id=expired_order.id and oi.variant_id is not null
      group by oi.variant_id order by oi.variant_id
    loop
      update public.inventory_balances b
      set reserved=greatest(b.reserved-order_line.quantity,0), updated_at=now()
      where b.tenant_id=p_tenant_id and b.variant_id=order_line.variant_id and b.location_id=main_location;

      insert into public.inventory_movements(
        tenant_id,variant_id,location_id,quantity_delta,movement_type,reason,source_reference,idempotency_key,actor_user_id
      ) values (
        p_tenant_id,order_line.variant_id,main_location,-order_line.quantity,'reservation_release',
        'Expired checkout reservation',expired_order.id::text,
        'expire:' || expired_order.id::text || ':' || order_line.variant_id::text,null
      ) on conflict (tenant_id,idempotency_key) do nothing;
    end loop;

    update public.orders set status='cancelled', payment_status='cancelled',
      notes=left(concat_ws(E'\n',nullif(notes,''),'Checkout reservation expired after 30 minutes'),5000),
      updated_at=now()
    where id=expired_order.id and tenant_id=p_tenant_id;
    released_count := released_count + 1;
  end loop;
  return released_count;
end;
$$;

revoke all on function public.release_expired_reservations_for_tenant(uuid) from public, anon, authenticated;

create or replace function public.cleanup_expired_checkout_reservations_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.release_expired_reservations_for_tenant(new.tenant_id);
  return new;
end;
$$;
revoke all on function public.cleanup_expired_checkout_reservations_trigger() from public, anon, authenticated;

drop trigger if exists cleanup_expired_checkout_reservations_before_order on public.orders;
create trigger cleanup_expired_checkout_reservations_before_order
before insert on public.orders
for each row when (new.status='pending' and new.payment_status='pending')
execute function public.cleanup_expired_checkout_reservations_trigger();

comment on column public.orders.reservation_expires_at is 'Pending public-checkout stock reservation expiry; default 30 minutes.';
