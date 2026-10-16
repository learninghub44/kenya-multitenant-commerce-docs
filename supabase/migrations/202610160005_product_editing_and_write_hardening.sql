-- Close direct table-write paths so product validation cannot be bypassed by authenticated clients.
-- Product mutations now go through an authorization-checked RPC.
drop policy if exists "catalog staff can manage products" on public.products;
drop policy if exists "catalog staff can manage variants" on public.product_variants;

create or replace function public.update_product_with_default_variant(
  p_tenant_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_price_minor bigint,
  p_sku text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clean_title text := trim(coalesce(p_title, ''));
  clean_slug text := lower(trim(coalesce(p_slug, '')));
  clean_description text := coalesce(p_description, '');
  clean_sku text := nullif(trim(coalesce(p_sku, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not public.has_tenant_role(
    p_tenant_id,
    array['owner','manager','catalog_editor']::public.membership_role[]
  ) then
    raise exception 'You do not have permission to manage this catalogue' using errcode = '42501';
  end if;
  if length(clean_title) < 1 or length(clean_title) > 180 then
    raise exception 'Product title must be between 1 and 180 characters' using errcode = '22023';
  end if;
  if clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(clean_slug) > 180 then
    raise exception 'Use a valid product slug made of lowercase letters, numbers and hyphens' using errcode = '22023';
  end if;
  if length(clean_description) > 10000 then
    raise exception 'Product description is too long' using errcode = '22023';
  end if;
  if p_price_minor is null or p_price_minor < 0 or p_price_minor > 1000000000000 then
    raise exception 'Enter a valid non-negative price' using errcode = '22023';
  end if;
  if clean_sku is not null and length(clean_sku) > 80 then
    raise exception 'SKU must be 80 characters or fewer' using errcode = '22023';
  end if;
  if p_status not in ('draft', 'published') then
    raise exception 'Products can only be saved as draft or published' using errcode = '22023';
  end if;

  update public.products
  set title = clean_title,
      slug = clean_slug,
      description = clean_description,
      status = p_status::public.record_status,
      updated_at = now()
  where id = p_product_id and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Product not found in this workspace' using errcode = 'P0002';
  end if;

  update public.product_variants
  set sku = clean_sku,
      price_minor = p_price_minor,
      status = p_status::public.record_status,
      updated_at = now()
  where id = p_variant_id
    and product_id = p_product_id
    and tenant_id = p_tenant_id;

  if not found then
    raise exception 'Product variant not found in this workspace' using errcode = 'P0002';
  end if;
exception
  when unique_violation then
    raise exception 'That product slug or SKU is already used in this business' using errcode = '23505';
end;
$$;

revoke all on function public.update_product_with_default_variant(uuid, uuid, uuid, text, text, text, bigint, text, text) from public, anon;
grant execute on function public.update_product_with_default_variant(uuid, uuid, uuid, text, text, text, bigint, text, text) to authenticated;

-- Product and its default variant should begin in the same lifecycle state.
create or replace function public.create_product_with_default_variant(
  p_tenant_id uuid,
  p_title text,
  p_slug text,
  p_description text,
  p_price_minor bigint,
  p_sku text default null
)
returns table (product_id uuid, variant_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  clean_title text := trim(coalesce(p_title, ''));
  clean_slug text := lower(trim(coalesce(p_slug, '')));
  clean_description text := coalesce(p_description, '');
  clean_sku text := nullif(trim(coalesce(p_sku, '')), '');
  new_product_id uuid;
  new_variant_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not public.has_tenant_role(
    p_tenant_id,
    array['owner','manager','catalog_editor']::public.membership_role[]
  ) then
    raise exception 'You do not have permission to manage this catalogue' using errcode = '42501';
  end if;
  if length(clean_title) < 1 or length(clean_title) > 180 then
    raise exception 'Product title must be between 1 and 180 characters' using errcode = '22023';
  end if;
  if clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(clean_slug) > 180 then
    raise exception 'Use a valid product slug made of lowercase letters, numbers and hyphens' using errcode = '22023';
  end if;
  if length(clean_description) > 10000 then
    raise exception 'Product description is too long' using errcode = '22023';
  end if;
  if p_price_minor is null or p_price_minor < 0 or p_price_minor > 1000000000000 then
    raise exception 'Enter a valid non-negative price' using errcode = '22023';
  end if;
  if clean_sku is not null and length(clean_sku) > 80 then
    raise exception 'SKU must be 80 characters or fewer' using errcode = '22023';
  end if;

  insert into public.products (tenant_id, title, slug, description, status, track_inventory)
  values (p_tenant_id, clean_title, clean_slug, clean_description, 'draft', true)
  returning id into new_product_id;

  insert into public.product_variants (tenant_id, product_id, sku, title, price_minor, currency, status)
  values (p_tenant_id, new_product_id, clean_sku, 'Default', p_price_minor, 'KES', 'draft')
  returning id into new_variant_id;

  return query select new_product_id, new_variant_id;
exception
  when unique_violation then
    raise exception 'A product with this slug or SKU already exists in this business' using errcode = '23505';
end;
$$;

revoke all on function public.create_product_with_default_variant(uuid, text, text, text, bigint, text) from public, anon;
grant execute on function public.create_product_with_default_variant(uuid, text, text, text, bigint, text) to authenticated;
