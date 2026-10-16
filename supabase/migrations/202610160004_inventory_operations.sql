-- Give each existing tenant a default stock location. New tenants receive one in the updated RPC below.
insert into public.inventory_locations (tenant_id, name, code, active)
select t.id, 'Main store', 'MAIN', true
from public.tenants t
where not exists (
  select 1 from public.inventory_locations l
  where l.tenant_id = t.id and l.code = 'MAIN'
);

create or replace function public.create_tenant_for_current_user(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  new_tenant_id uuid;
  clean_name text := trim(coalesce(p_name, ''));
  clean_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(clean_name) < 2 or length(clean_name) > 120 then
    raise exception 'Business name must be between 2 and 120 characters' using errcode = '22023';
  end if;
  if clean_slug !~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$' then
    raise exception 'Store slug must be 3-50 lowercase letters, numbers or hyphens' using errcode = '22023';
  end if;

  insert into public.tenants (name, slug, status, currency, timezone)
  values (clean_name, clean_slug, 'active', 'KES', 'Africa/Nairobi')
  returning id into new_tenant_id;
  insert into public.tenant_memberships (tenant_id, user_id, role, active)
  values (new_tenant_id, current_user_id, 'owner', true);
  insert into public.inventory_locations (tenant_id, name, code, active)
  values (new_tenant_id, 'Main store', 'MAIN', true);
  return new_tenant_id;
exception
  when unique_violation then
    raise exception 'That store address is already taken. Choose another one.' using errcode = '23505';
end;
$$;

revoke all on function public.create_tenant_for_current_user(text, text) from public, anon;
grant execute on function public.create_tenant_for_current_user(text, text) to authenticated;

-- All inventory mutations pass through this transaction. The stock ledger and balance
-- update commit together; the client cannot write either table directly.
create or replace function public.record_inventory_movement(
  p_tenant_id uuid,
  p_variant_id uuid,
  p_location_id uuid,
  p_quantity_delta integer,
  p_movement_type text,
  p_reason text,
  p_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.inventory_movements%rowtype;
  current_balance integer;
  current_reserved integer;
  next_balance integer;
  clean_reason text := trim(coalesce(p_reason, ''));
  clean_key text := trim(coalesce(p_idempotency_key, ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not public.has_tenant_role(
    p_tenant_id,
    array['owner','manager','stock_clerk']::public.membership_role[]
  ) then
    raise exception 'You do not have permission to change stock' using errcode = '42501';
  end if;
  if p_quantity_delta is null or p_quantity_delta = 0 then
    raise exception 'Quantity change cannot be zero' using errcode = '22023';
  end if;
  if p_movement_type not in ('receipt', 'adjustment') then
    raise exception 'Only receipts and stock adjustments are available here' using errcode = '22023';
  end if;
  if p_movement_type = 'receipt' and p_quantity_delta < 1 then
    raise exception 'A receipt quantity must be positive' using errcode = '22023';
  end if;
  if length(clean_reason) < 3 or length(clean_reason) > 500 then
    raise exception 'Reason must be between 3 and 500 characters' using errcode = '22023';
  end if;
  if length(clean_key) < 8 or length(clean_key) > 128 then
    raise exception 'A valid idempotency key is required' using errcode = '22023';
  end if;

  -- Serialize requests sharing the same idempotency key, even if they target different rows.
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':' || clean_key, 0));
  select * into existing
  from public.inventory_movements
  where tenant_id = p_tenant_id and idempotency_key = clean_key;

  if found then
    if existing.variant_id <> p_variant_id
      or existing.location_id <> p_location_id
      or existing.quantity_delta <> p_quantity_delta
      or existing.movement_type <> p_movement_type
      or existing.reason <> clean_reason then
      raise exception 'Idempotency key was already used for a different stock operation' using errcode = '22023';
    end if;
    select b.on_hand into current_balance
    from public.inventory_balances b
    where b.tenant_id = p_tenant_id and b.variant_id = p_variant_id and b.location_id = p_location_id;
    return current_balance;
  end if;

  -- Insert then lock the balance row to serialize concurrent adjustments for this SKU/location.
  insert into public.inventory_balances (tenant_id, variant_id, location_id, on_hand, reserved)
  values (p_tenant_id, p_variant_id, p_location_id, 0, 0)
  on conflict (tenant_id, variant_id, location_id) do nothing;

  select b.on_hand, b.reserved into current_balance, current_reserved
  from public.inventory_balances b
  where b.tenant_id = p_tenant_id and b.variant_id = p_variant_id and b.location_id = p_location_id
  for update;

  next_balance := current_balance + p_quantity_delta;
  if next_balance < current_reserved then
    raise exception 'Stock cannot fall below already reserved quantity' using errcode = '23514';
  end if;
  if next_balance < 0 then
    raise exception 'Insufficient stock for this adjustment' using errcode = '23514';
  end if;

  insert into public.inventory_movements (
    tenant_id, variant_id, location_id, quantity_delta, movement_type,
    reason, idempotency_key, actor_user_id
  ) values (
    p_tenant_id, p_variant_id, p_location_id, p_quantity_delta, p_movement_type,
    clean_reason, clean_key, auth.uid()
  );

  update public.inventory_balances
  set on_hand = next_balance, updated_at = now()
  where tenant_id = p_tenant_id and variant_id = p_variant_id and location_id = p_location_id;

  return next_balance;
end;
$$;

revoke all on function public.record_inventory_movement(uuid, uuid, uuid, integer, text, text, text) from public, anon;
grant execute on function public.record_inventory_movement(uuid, uuid, uuid, integer, text, text, text) to authenticated;
