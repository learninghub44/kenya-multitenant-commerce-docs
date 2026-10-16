-- Make terminal order transitions non-repeatable and fail closed on stock-ledger
-- inconsistencies. Any raised exception rolls back both balance and ledger changes.
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
    order by o.reservation_expires_at, o.id
    for update
  loop
    for order_line in
      select oi.variant_id, sum(oi.quantity)::integer as quantity
      from public.order_items oi
      join public.product_variants v on v.tenant_id=oi.tenant_id and v.id=oi.variant_id
      join public.products p on p.tenant_id=v.tenant_id and p.id=v.product_id and p.track_inventory
      where oi.tenant_id=p_tenant_id and oi.order_id=expired_order.id and oi.variant_id is not null
      group by oi.variant_id order by oi.variant_id
    loop
      update public.inventory_balances b
      set reserved=b.reserved-order_line.quantity, updated_at=now()
      where b.tenant_id=p_tenant_id and b.variant_id=order_line.variant_id
        and b.location_id=main_location and b.reserved>=order_line.quantity;
      if not found then
        raise exception 'Cannot release expired reservation: stock balance is inconsistent for order %', expired_order.id
          using errcode='23514';
      end if;

      insert into public.inventory_movements(
        tenant_id,variant_id,location_id,quantity_delta,movement_type,reason,source_reference,idempotency_key,actor_user_id
      ) values (
        p_tenant_id,order_line.variant_id,main_location,-order_line.quantity,'reservation_release',
        'Expired checkout reservation',expired_order.id::text,
        'expire:' || expired_order.id::text || ':' || order_line.variant_id::text,null
      );
    end loop;

    update public.orders set status='cancelled',payment_status='cancelled',
      notes=left(concat_ws(E'\\n',nullif(notes,''),'Checkout reservation expired after 30 minutes'),5000),
      updated_at=now()
    where id=expired_order.id and tenant_id=p_tenant_id
      and status='pending' and payment_status='pending';
    if not found then
      raise exception 'Order changed while expiring reservation %', expired_order.id using errcode='40001';
    end if;
    released_count := released_count+1;
  end loop;
  return released_count;
end;
$$;
revoke all on function public.release_expired_reservations_for_tenant(uuid) from public,anon,authenticated;

create or replace function public.transition_order_status(
  p_tenant_id uuid, p_order_id uuid, p_status text, p_reason text default ''
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_order public.orders%rowtype;
  line record;
  main_location uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id,array['owner','manager','order_operator']::public.membership_role[]) then
    raise exception 'You do not have permission to manage orders' using errcode='42501';
  end if;
  if p_status not in ('processing','ready_for_fulfilment','fulfilled','cancelled') then
    raise exception 'Unsupported order transition' using errcode='22023';
  end if;
  if length(coalesce(p_reason,''))>1000 then raise exception 'Reason is too long' using errcode='22023'; end if;

  select * into target_order from public.orders o
  where o.id=p_order_id and o.tenant_id=p_tenant_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  if target_order.status in ('cancelled','fulfilled','refunded') then
    raise exception 'Terminal orders cannot be transitioned again' using errcode='22023';
  end if;

  if p_status='cancelled' then
    if target_order.payment_status='succeeded' then
      raise exception 'Paid orders require a verified refund workflow' using errcode='22023';
    end if;
    if target_order.status not in ('pending','confirmed') then
      raise exception 'Only pending or confirmed unpaid orders can be cancelled' using errcode='22023';
    end if;
    select l.id into main_location from public.inventory_locations l
      where l.tenant_id=p_tenant_id and l.code='MAIN' and l.active;
    if main_location is not null then
      for line in
        select oi.variant_id,sum(oi.quantity)::integer as quantity
        from public.order_items oi
        join public.product_variants v on v.tenant_id=oi.tenant_id and v.id=oi.variant_id
        join public.products p on p.tenant_id=v.tenant_id and p.id=v.product_id and p.track_inventory
        where oi.tenant_id=p_tenant_id and oi.order_id=p_order_id and oi.variant_id is not null
        group by oi.variant_id order by oi.variant_id
      loop
        update public.inventory_balances b
        set reserved=b.reserved-line.quantity,updated_at=now()
        where b.tenant_id=p_tenant_id and b.variant_id=line.variant_id
          and b.location_id=main_location and b.reserved>=line.quantity;
        if not found then
          raise exception 'Cannot cancel order: stock reservation is inconsistent' using errcode='23514';
        end if;
        insert into public.inventory_movements(
          tenant_id,variant_id,location_id,quantity_delta,movement_type,reason,source_reference,idempotency_key,actor_user_id
        ) values (
          p_tenant_id,line.variant_id,main_location,-line.quantity,'reservation_release',
          coalesce(nullif(trim(p_reason),''),'Order cancelled'),p_order_id::text,
          'cancel:' || p_order_id::text || ':' || line.variant_id::text,auth.uid()
        );
      end loop;
    end if;
    update public.orders set status='cancelled',payment_status='cancelled',
      notes=left(concat_ws(E'\\n',nullif(notes,''),nullif(trim(p_reason),'')),5000),updated_at=now()
    where id=p_order_id and tenant_id=p_tenant_id;
  elsif p_status='processing' then
    if target_order.status<>'confirmed' or target_order.payment_status<>'succeeded' then
      raise exception 'Only confirmed, paid orders can enter processing' using errcode='22023';
    end if;
    update public.orders set status='processing',updated_at=now() where id=p_order_id and tenant_id=p_tenant_id;
  elsif p_status='ready_for_fulfilment' then
    if target_order.status<>'processing' or target_order.payment_status<>'succeeded' then
      raise exception 'Only paid orders in processing can be marked ready' using errcode='22023';
    end if;
    update public.orders set status='ready_for_fulfilment',updated_at=now() where id=p_order_id and tenant_id=p_tenant_id;
  elsif p_status='fulfilled' then
    if target_order.status<>'ready_for_fulfilment' or target_order.payment_status<>'succeeded' then
      raise exception 'Only paid, ready orders can be fulfilled' using errcode='22023';
    end if;
    select l.id into main_location from public.inventory_locations l
      where l.tenant_id=p_tenant_id and l.code='MAIN' and l.active;
    if main_location is null then raise exception 'Main inventory location is missing' using errcode='55000'; end if;
    for line in
      select oi.variant_id,sum(oi.quantity)::integer as quantity
      from public.order_items oi
      join public.product_variants v on v.tenant_id=oi.tenant_id and v.id=oi.variant_id
      join public.products p on p.tenant_id=v.tenant_id and p.id=v.product_id and p.track_inventory
      where oi.tenant_id=p_tenant_id and oi.order_id=p_order_id and oi.variant_id is not null
      group by oi.variant_id order by oi.variant_id
    loop
      update public.inventory_balances b
      set reserved=b.reserved-line.quantity,on_hand=b.on_hand-line.quantity,updated_at=now()
      where b.tenant_id=p_tenant_id and b.variant_id=line.variant_id
        and b.location_id=main_location and b.reserved>=line.quantity and b.on_hand>=line.quantity;
      if not found then raise exception 'Reserved stock is inconsistent; fulfilment stopped' using errcode='23514'; end if;
      insert into public.inventory_movements(
        tenant_id,variant_id,location_id,quantity_delta,movement_type,reason,source_reference,idempotency_key,actor_user_id
      ) values (
        p_tenant_id,line.variant_id,main_location,-line.quantity,'sale',
        coalesce(nullif(trim(p_reason),''),'Order fulfilled'),p_order_id::text,
        'sale:' || p_order_id::text || ':' || line.variant_id::text,auth.uid()
      );
    end loop;
    update public.orders set status='fulfilled',updated_at=now() where id=p_order_id and tenant_id=p_tenant_id;
  end if;

  insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_tenant_id,auth.uid(),'order.status_changed','order',p_order_id::text,
    jsonb_build_object('from',target_order.status,'to',p_status,'reason',trim(coalesce(p_reason,''))));
end;
$$;
revoke all on function public.transition_order_status(uuid,uuid,text,text) from public,anon;
grant execute on function public.transition_order_status(uuid,uuid,text,text) to authenticated;
