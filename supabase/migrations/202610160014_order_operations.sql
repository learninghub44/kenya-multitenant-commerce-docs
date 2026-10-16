-- Merchant order operations. Manual payment is an explicit staff attestation and is
-- never triggered by a browser redirect or customer-submitted value.
create or replace function public.record_manual_order_payment(
  p_tenant_id uuid, p_order_id uuid, p_reference text, p_notes text default ''
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_order public.orders%rowtype;
  clean_reference text := trim(coalesce(p_reference,''));
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id,array['owner','manager','finance_viewer']::public.membership_role[]) then
    raise exception 'You do not have permission to record payments' using errcode='42501';
  end if;
  if length(clean_reference)<3 or length(clean_reference)>120 then raise exception 'Enter the actual payment reference' using errcode='22023'; end if;
  if length(coalesce(p_notes,''))>1000 then raise exception 'Payment notes are too long' using errcode='22023'; end if;

  select * into target_order from public.orders o
  where o.id=p_order_id and o.tenant_id=p_tenant_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  if target_order.status not in ('pending','confirmed') or target_order.payment_status not in ('pending','failed') then
    raise exception 'This order cannot accept a manual payment record' using errcode='22023';
  end if;

  insert into public.payment_transactions(
    tenant_id,order_id,provider,merchant_reference,status,amount_minor,currency,response_summary,last_error
  ) values (
    p_tenant_id,p_order_id,'manual','manual:' || p_order_id::text,'succeeded',
    target_order.total_minor,target_order.currency,
    jsonb_build_object('reference',clean_reference,'notes',trim(coalesce(p_notes,'')),'recorded_by',auth.uid()),
    null
  );

  update public.orders set payment_status='succeeded', status='confirmed', updated_at=now()
  where id=p_order_id and tenant_id=p_tenant_id;

  insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_tenant_id,auth.uid(),'payment.manual_recorded','order',p_order_id::text,
    jsonb_build_object('reference',clean_reference,'amount_minor',target_order.total_minor));
end;
$$;

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

  if p_status='cancelled' then
    if target_order.status='fulfilled' then raise exception 'Fulfilled orders cannot be cancelled here' using errcode='22023'; end if;
    if target_order.payment_status='succeeded' then raise exception 'Paid orders require a verified refund workflow' using errcode='22023'; end if;
    select l.id into main_location from public.inventory_locations l
      where l.tenant_id=p_tenant_id and l.code='MAIN' and l.active;
    if main_location is not null then
      for line in select oi.variant_id, sum(oi.quantity)::integer as quantity
        from public.order_items oi where oi.tenant_id=p_tenant_id and oi.order_id=p_order_id and oi.variant_id is not null
        group by oi.variant_id order by oi.variant_id
      loop
        update public.inventory_balances b set reserved=greatest(b.reserved-line.quantity,0),updated_at=now()
        where b.tenant_id=p_tenant_id and b.variant_id=line.variant_id and b.location_id=main_location;
        insert into public.inventory_movements(tenant_id,variant_id,location_id,quantity_delta,movement_type,reason,source_reference,idempotency_key,actor_user_id)
        values(p_tenant_id,line.variant_id,main_location,-line.quantity,'reservation_release',
          coalesce(nullif(trim(p_reason),''),'Order cancelled'),p_order_id::text,
          'cancel:' || p_order_id::text || ':' || line.variant_id::text,auth.uid())
        on conflict(tenant_id,idempotency_key) do nothing;
      end loop;
    end if;
    update public.orders set status='cancelled',payment_status='cancelled',
      notes=left(concat_ws(E'\n',nullif(notes,''),nullif(trim(p_reason),'')),5000),updated_at=now()
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
    for line in select oi.variant_id, sum(oi.quantity)::integer as quantity
      from public.order_items oi where oi.tenant_id=p_tenant_id and oi.order_id=p_order_id and oi.variant_id is not null
      group by oi.variant_id order by oi.variant_id
    loop
      update public.inventory_balances b
      set reserved=reserved-line.quantity,on_hand=on_hand-line.quantity,updated_at=now()
      where b.tenant_id=p_tenant_id and b.variant_id=line.variant_id and b.location_id=main_location
        and b.reserved>=line.quantity and b.on_hand>=line.quantity;
      if not found then raise exception 'Reserved stock is inconsistent; fulfilment stopped' using errcode='23514'; end if;
      insert into public.inventory_movements(tenant_id,variant_id,location_id,quantity_delta,movement_type,reason,source_reference,idempotency_key,actor_user_id)
      values(p_tenant_id,line.variant_id,main_location,-line.quantity,'sale',
        coalesce(nullif(trim(p_reason),''),'Order fulfilled'),p_order_id::text,
        'sale:' || p_order_id::text || ':' || line.variant_id::text,auth.uid())
      on conflict(tenant_id,idempotency_key) do nothing;
    end loop;
    update public.orders set status='fulfilled',updated_at=now() where id=p_order_id and tenant_id=p_tenant_id;
  end if;

  insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_tenant_id,auth.uid(),'order.status_changed','order',p_order_id::text,
    jsonb_build_object('from',target_order.status,'to',p_status,'reason',trim(coalesce(p_reason,''))));
end;
$$;

revoke all on function public.record_manual_order_payment(uuid,uuid,text,text) from public,anon;
revoke all on function public.transition_order_status(uuid,uuid,text,text) from public,anon;
grant execute on function public.record_manual_order_payment(uuid,uuid,text,text) to authenticated;
grant execute on function public.transition_order_status(uuid,uuid,text,text) to authenticated;
