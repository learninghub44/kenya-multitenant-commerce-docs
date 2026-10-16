-- Public checkout is deliberately cash/manual-payment pending only. Prices and stock are
-- resolved server-side from published variants; the browser never submits trusted totals.
alter table public.orders add column if not exists checkout_fingerprint text not null default '';

create or replace function public.create_public_order(
  p_store_slug text,
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_idempotency_key text
)
returns table (order_id uuid, order_number text, total_minor bigint, currency char(3))
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_tenant uuid;
  main_location uuid;
  clean_name text := trim(coalesce(p_customer_name,''));
  clean_phone text := trim(coalesce(p_customer_phone,''));
  clean_address text := trim(coalesce(p_delivery_address,''));
  clean_key text := trim(coalesce(p_idempotency_key,''));
  fingerprint text;
  existing_order public.orders%rowtype;
  item record;
  variant_row record;
  current_on_hand integer;
  current_reserved integer;
  subtotal bigint := 0;
  new_order_id uuid;
  new_order_number text;
  line_total bigint;
  rate_count integer;
begin
  if length(clean_name)<2 or length(clean_name)>180 then raise exception 'Enter a customer name' using errcode='22023'; end if;
  if length(clean_phone)<7 or length(clean_phone)>40 then raise exception 'Enter a valid contact phone number' using errcode='22023'; end if;
  if length(clean_address)>2000 then raise exception 'Delivery address is too long' using errcode='22023'; end if;
  if length(clean_key)<8 or length(clean_key)>160 then raise exception 'A valid checkout idempotency key is required' using errcode='22023'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>50 then
    raise exception 'Choose between 1 and 50 product lines' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where jsonb_typeof(e) <> 'object'
       or coalesce(e->>'variant_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(e->>'quantity','') !~ '^[0-9]{1,6}$'
       or (e->>'quantity')::integer < 1 or (e->>'quantity')::integer > 1000
  ) then
    raise exception 'Each item must contain a valid variant ID and quantity from 1 to 1000' using errcode='22023';
  end if;

  select t.id into target_tenant from public.tenants t
  where t.slug=lower(trim(coalesce(p_store_slug,''))) and t.status='active';
  if target_tenant is null then raise exception 'Store not found' using errcode='P0002'; end if;

  fingerprint := md5(lower(trim(p_store_slug)) || '|' || p_items::text || '|' || clean_name || '|' || clean_phone || '|' || clean_address);
  perform pg_advisory_xact_lock(hashtextextended(target_tenant::text || ':' || clean_key, 0));
  select * into existing_order from public.orders o
  where o.tenant_id=target_tenant and o.idempotency_key=clean_key;
  if found then
    if existing_order.checkout_fingerprint <> fingerprint then
      raise exception 'This checkout key was already used for different order details' using errcode='22023';
    end if;
    return query select existing_order.id, existing_order.order_number, existing_order.total_minor, existing_order.currency;
    return;
  end if;

  -- Basic per-phone throttling. The lock prevents parallel requests bypassing the count.
  perform pg_advisory_xact_lock(hashtextextended(target_tenant::text || ':phone:' || clean_phone, 0));
  select count(*) into rate_count from public.orders o
  where o.tenant_id=target_tenant and o.customer_phone_snapshot=clean_phone
    and o.created_at > now() - interval '10 minutes'
    and o.status not in ('cancelled');
  if rate_count >= 5 then raise exception 'Too many checkout attempts. Try again in a few minutes.' using errcode='54000'; end if;

  select l.id into main_location from public.inventory_locations l
  where l.tenant_id=target_tenant and l.code='MAIN' and l.active;
  if main_location is null then raise exception 'Store inventory location is not configured' using errcode='55000'; end if;

  -- Lock all requested published variants in stable order and calculate the true subtotal.
  for item in
    select (e->>'variant_id')::uuid as variant_id, sum((e->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) e group by 1 order by 1
  loop
    select v.id, v.tenant_id, v.product_id, v.title as variant_title, v.sku, v.price_minor,
           v.currency, p.title as product_title, p.track_inventory
    into variant_row
    from public.product_variants v
    join public.products p on p.tenant_id=v.tenant_id and p.id=v.product_id
    left join public.categories c on c.tenant_id=p.tenant_id and c.id=p.category_id
    where v.id=item.variant_id and v.tenant_id=target_tenant
      and v.status='published' and p.status='published'
      and (p.category_id is null or c.status='published')
    for update of v;
    if not found then raise exception 'One of the selected products is no longer available' using errcode='P0002'; end if;
    if variant_row.currency <> 'KES' then raise exception 'This checkout currently supports KES only' using errcode='22023'; end if;
    subtotal := subtotal + variant_row.price_minor * item.quantity;
    if subtotal > 1000000000000000 then raise exception 'Order total is too large' using errcode='22003'; end if;
  end loop;

  new_order_number := 'ORD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.orders (
    tenant_id, order_number, status, payment_status, currency, subtotal_minor,
    discount_minor, delivery_minor, total_minor, customer_name_snapshot,
    customer_phone_snapshot, delivery_address_snapshot, idempotency_key, checkout_fingerprint
  ) values (
    target_tenant, new_order_number, 'pending', 'pending', 'KES', subtotal,
    0, 0, subtotal, clean_name, clean_phone, clean_address, clean_key, fingerprint
  ) returning id into new_order_id;

  for item in
    select (e->>'variant_id')::uuid as variant_id, sum((e->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) e group by 1 order by 1
  loop
    select v.id, v.tenant_id, v.product_id, v.title as variant_title, v.sku, v.price_minor,
           p.title as product_title, p.track_inventory
    into variant_row
    from public.product_variants v join public.products p
      on p.tenant_id=v.tenant_id and p.id=v.product_id
    where v.id=item.variant_id and v.tenant_id=target_tenant
    for update of v;

    insert into public.order_items (
      tenant_id, order_id, variant_id, product_title_snapshot, variant_title_snapshot,
      sku_snapshot, quantity, unit_price_minor
    ) values (
      target_tenant, new_order_id, variant_row.id, variant_row.product_title,
      variant_row.variant_title, variant_row.sku, item.quantity, variant_row.price_minor
    );

    if variant_row.track_inventory then
      insert into public.inventory_balances(tenant_id,variant_id,location_id,on_hand,reserved)
      values(target_tenant,variant_row.id,main_location,0,0)
      on conflict(tenant_id,variant_id,location_id) do nothing;
      select b.on_hand,b.reserved into current_on_hand,current_reserved
      from public.inventory_balances b
      where b.tenant_id=target_tenant and b.variant_id=variant_row.id and b.location_id=main_location
      for update;
      if current_on_hand-current_reserved < item.quantity then
        raise exception 'Insufficient stock for %', variant_row.product_title using errcode='23514';
      end if;
      update public.inventory_balances set reserved=reserved+item.quantity, updated_at=now()
      where tenant_id=target_tenant and variant_id=variant_row.id and location_id=main_location;
      insert into public.inventory_movements(
        tenant_id,variant_id,location_id,quantity_delta,movement_type,reason,source_reference,idempotency_key,actor_user_id
      ) values (
        target_tenant,variant_row.id,main_location,item.quantity,'reservation',
        'Public checkout stock reservation',new_order_id::text,
        'checkout:' || new_order_id::text || ':' || variant_row.id::text,null
      );
    end if;
  end loop;

  return query select new_order_id, new_order_number, subtotal, 'KES'::char(3);
end;
$$;

revoke all on function public.create_public_order(text,jsonb,text,text,text,text) from public;
grant execute on function public.create_public_order(text,jsonb,text,text,text,text) to anon, authenticated;
comment on function public.create_public_order(text,jsonb,text,text,text,text) is
  'Creates a pending KES order with DB-derived prices and atomic stock reservations. Does not confirm payment.';
