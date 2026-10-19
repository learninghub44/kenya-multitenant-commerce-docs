-- Buyer accounts: profile, order ownership, wishlist and order history.
-- Guests can still check out; signed-in buyers get their orders linked to their account
-- and a customer record in the store they bought from. Everything is written through
-- security-definer functions that use auth.uid(), never a client-supplied user id.

create table public.buyer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (full_name is null or length(full_name) between 2 and 120),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  default_address text check (default_address is null or length(default_address) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.buyer_profiles enable row level security;
create policy buyer_profiles_own_read on public.buyer_profiles
  for select to authenticated using (user_id = auth.uid());

create or replace function public.save_buyer_profile(p_full_name text, p_phone text, p_address text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clean_name text := public.clean_store_text(p_full_name, 120, 'Name');
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if clean_name is null or length(clean_name) < 2 then
    raise exception 'Enter your name' using errcode = '22023';
  end if;
  insert into public.buyer_profiles (user_id, full_name, phone, default_address)
  values (auth.uid(), clean_name, public.clean_store_phone(p_phone, 'Phone'), public.clean_store_text(p_address, 2000, 'Address'))
  on conflict (user_id) do update set
    full_name = excluded.full_name, phone = excluded.phone,
    default_address = excluded.default_address, updated_at = now();
end;
$$;
revoke all on function public.save_buyer_profile(text, text, text) from public, anon;
grant execute on function public.save_buyer_profile(text, text, text) to authenticated;

alter table public.orders add column if not exists buyer_user_id uuid references auth.users(id) on delete set null;
create index if not exists orders_buyer_idx on public.orders (buyer_user_id, created_at desc) where buyer_user_id is not null;

alter table public.customers add column if not exists buyer_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists customers_tenant_buyer_idx on public.customers (tenant_id, buyer_user_id) where buyer_user_id is not null;

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
  buyer_customer_id uuid;
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

  -- Signed-in buyers get a customer record in this store (created once, then updated)
  -- and the order is linked to their account so they can see it later.
  if auth.uid() is not null then
    insert into public.customers (tenant_id, display_name, phone, buyer_user_id)
    values (target_tenant, clean_name, clean_phone, auth.uid())
    on conflict (tenant_id, buyer_user_id) where buyer_user_id is not null
    do update set display_name = excluded.display_name, phone = excluded.phone, updated_at = now()
    returning id into buyer_customer_id;
  end if;

  new_order_number := 'ORD-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.orders (
    tenant_id, order_number, status, payment_status, currency, subtotal_minor,
    discount_minor, delivery_minor, total_minor, customer_name_snapshot,
    customer_phone_snapshot, delivery_address_snapshot, idempotency_key, checkout_fingerprint,
    customer_id, buyer_user_id
  ) values (
    target_tenant, new_order_number, 'pending', 'pending', 'KES', subtotal,
    0, 0, subtotal, clean_name, clean_phone, clean_address, clean_key, fingerprint,
    buyer_customer_id, auth.uid()
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

create table public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null,
  product_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id) on delete cascade
);
create index wishlist_items_user_tenant_idx on public.wishlist_items (user_id, tenant_id);
alter table public.wishlist_items enable row level security;
create policy wishlist_items_own_read on public.wishlist_items
  for select to authenticated using (user_id = auth.uid());

create or replace function public.toggle_wishlist(p_store_slug text, p_product_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_tenant uuid;
  removed integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to save favourites' using errcode = '28000';
  end if;
  select t.id into target_tenant from public.tenants t
  where t.slug = lower(trim(coalesce(p_store_slug, ''))) and t.status = 'active';
  if target_tenant is null then
    raise exception 'Store not found' using errcode = 'P0002';
  end if;
  delete from public.wishlist_items w
  where w.user_id = auth.uid() and w.tenant_id = target_tenant and w.product_id = p_product_id;
  get diagnostics removed = row_count;
  if removed > 0 then return false; end if;
  if not exists (select 1 from public.products p where p.id = p_product_id and p.tenant_id = target_tenant and p.status = 'published') then
    raise exception 'That product is not available' using errcode = 'P0002';
  end if;
  if (select count(*) from public.wishlist_items w where w.user_id = auth.uid()) >= 200 then
    raise exception 'Your favourites list is full' using errcode = '54000';
  end if;
  insert into public.wishlist_items (user_id, tenant_id, product_id) values (auth.uid(), target_tenant, p_product_id);
  return true;
end;
$$;
revoke all on function public.toggle_wishlist(text, uuid) from public, anon;
grant execute on function public.toggle_wishlist(text, uuid) to authenticated;

create or replace function public.get_my_wishlist_ids(p_store_slug text)
returns setof uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select w.product_id from public.wishlist_items w
  join public.tenants t on t.id = w.tenant_id
  where w.user_id = auth.uid() and t.slug = lower(trim(coalesce(p_store_slug, ''))) and t.status = 'active'
  order by w.created_at desc;
$$;
revoke all on function public.get_my_wishlist_ids(text) from public, anon;
grant execute on function public.get_my_wishlist_ids(text) to authenticated;

-- Order history for the signed-in buyer across every store they bought from.
create or replace function public.get_my_orders()
returns table (
  order_id uuid, order_number text, status text, payment_status text,
  total_minor bigint, currency char(3), created_at timestamptz,
  store_name text, store_slug text, store_phone text, store_whatsapp text, items jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select o.id, o.order_number, o.status::text, o.payment_status::text,
    o.total_minor, o.currency, o.created_at,
    t.name, t.slug, sp.phone, sp.whatsapp,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', i.product_title_snapshot, 'variant', i.variant_title_snapshot,
        'quantity', i.quantity, 'unit_price_minor', i.unit_price_minor
      ) order by i.created_at)
      from public.order_items i where i.tenant_id = o.tenant_id and i.order_id = o.id
    ), '[]'::jsonb)
  from public.orders o
  join public.tenants t on t.id = o.tenant_id
  left join public.store_profiles sp on sp.tenant_id = o.tenant_id
  where o.buyer_user_id = auth.uid()
  order by o.created_at desc
  limit 100;
$$;
revoke all on function public.get_my_orders() from public, anon;
grant execute on function public.get_my_orders() to authenticated;

-- Products that sold most in the last 90 days (cancelled and refunded orders ignored).
create or replace function public.get_public_best_sellers(p_store_slug text, p_limit integer default 8)
returns table (product_id uuid, units_sold bigint)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id, sum(i.quantity)::bigint as units
  from public.tenants t
  join public.orders o on o.tenant_id = t.id
  join public.order_items i on i.tenant_id = o.tenant_id and i.order_id = o.id
  join public.product_variants v on v.tenant_id = i.tenant_id and v.id = i.variant_id
  join public.products p on p.tenant_id = v.tenant_id and p.id = v.product_id
  where t.slug = lower(trim(coalesce(p_store_slug, ''))) and t.status = 'active'
    and p.status = 'published'
    and o.status not in ('cancelled', 'refunded')
    and o.created_at > now() - interval '90 days'
  group by p.id
  order by units desc, p.id
  limit greatest(1, least(coalesce(p_limit, 8), 20));
$$;
revoke all on function public.get_public_best_sellers(text, integer) from public;
grant execute on function public.get_public_best_sellers(text, integer) to anon, authenticated;
