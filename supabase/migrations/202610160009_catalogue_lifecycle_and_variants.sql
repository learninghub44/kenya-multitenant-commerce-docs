-- Catalogue lifecycle and full variant management. Keep all writes in checked RPCs.
create or replace function public.update_tenant_category(
  p_tenant_id uuid, p_category_id uuid, p_name text, p_slug text, p_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clean_name text := trim(coalesce(p_name, ''));
  clean_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]) then
    raise exception 'You do not have permission to manage categories' using errcode = '42501';
  end if;
  if length(clean_name) < 1 or length(clean_name) > 100 then
    raise exception 'Category name must be between 1 and 100 characters' using errcode = '22023';
  end if;
  if clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(clean_slug) > 100 then
    raise exception 'Use a valid category slug' using errcode = '22023';
  end if;
  if p_status not in ('published','archived') then
    raise exception 'Category status must be published or archived' using errcode = '22023';
  end if;
  update public.categories set name=clean_name, slug=clean_slug, status=p_status::public.record_status
  where id=p_category_id and tenant_id=p_tenant_id;
  if not found then raise exception 'Category not found in this workspace' using errcode = 'P0002'; end if;
exception when unique_violation then
  raise exception 'A category with that slug already exists in this business' using errcode = '23505';
end;
$$;

create or replace function public.create_product_variant(
  p_tenant_id uuid, p_product_id uuid, p_title text, p_sku text,
  p_price_minor bigint, p_options jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clean_title text := trim(coalesce(p_title,''));
  clean_sku text := nullif(trim(coalesce(p_sku,'')),'');
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]) then
    raise exception 'You do not have permission to manage variants' using errcode = '42501';
  end if;
  if not exists(select 1 from public.products where id=p_product_id and tenant_id=p_tenant_id and status <> 'archived') then
    raise exception 'Product not found or archived' using errcode = 'P0002';
  end if;
  if length(clean_title)<1 or length(clean_title)>180 then raise exception 'Variant title must be 1-180 characters' using errcode='22023'; end if;
  if clean_sku is not null and length(clean_sku)>80 then raise exception 'SKU must be 80 characters or fewer' using errcode='22023'; end if;
  if p_price_minor is null or p_price_minor<0 or p_price_minor>1000000000000 then raise exception 'Enter a valid price' using errcode='22023'; end if;
  if p_options is null or jsonb_typeof(p_options)<>'object' or octet_length(p_options::text)>4000 then raise exception 'Variant options must be a small JSON object' using errcode='22023'; end if;
  insert into public.product_variants(tenant_id,product_id,title,sku,price_minor,currency,options,status)
  values(p_tenant_id,p_product_id,clean_title,clean_sku,p_price_minor,'KES',p_options,'draft')
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'That SKU is already used in this business' using errcode='23505';
end;
$$;

create or replace function public.update_product_variant(
  p_tenant_id uuid, p_product_id uuid, p_variant_id uuid,
  p_title text, p_sku text, p_price_minor bigint, p_options jsonb, p_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clean_title text := trim(coalesce(p_title,''));
  clean_sku text := nullif(trim(coalesce(p_sku,'')),'');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]) then
    raise exception 'You do not have permission to manage variants' using errcode = '42501';
  end if;
  if length(clean_title)<1 or length(clean_title)>180 then raise exception 'Variant title must be 1-180 characters' using errcode='22023'; end if;
  if clean_sku is not null and length(clean_sku)>80 then raise exception 'SKU must be 80 characters or fewer' using errcode='22023'; end if;
  if p_price_minor is null or p_price_minor<0 or p_price_minor>1000000000000 then raise exception 'Enter a valid price' using errcode='22023'; end if;
  if p_options is null or jsonb_typeof(p_options)<>'object' or octet_length(p_options::text)>4000 then raise exception 'Variant options must be a small JSON object' using errcode='22023'; end if;
  if p_status not in ('draft','published','archived') then raise exception 'Invalid variant status' using errcode='22023'; end if;
  update public.product_variants set title=clean_title, sku=clean_sku, price_minor=p_price_minor,
    options=p_options, status=p_status::public.record_status, updated_at=now()
  where id=p_variant_id and product_id=p_product_id and tenant_id=p_tenant_id;
  if not found then raise exception 'Variant not found in this workspace' using errcode='P0002'; end if;
exception when unique_violation then
  raise exception 'That SKU is already used in this business' using errcode='23505';
end;
$$;

revoke all on function public.update_tenant_category(uuid,uuid,text,text,text) from public, anon;
revoke all on function public.create_product_variant(uuid,uuid,text,text,bigint,jsonb) from public, anon;
revoke all on function public.update_product_variant(uuid,uuid,uuid,text,text,bigint,jsonb,text) from public, anon;
grant execute on function public.update_tenant_category(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.create_product_variant(uuid,uuid,text,text,bigint,jsonb) to authenticated;
grant execute on function public.update_product_variant(uuid,uuid,uuid,text,text,bigint,jsonb,text) to authenticated;

comment on function public.update_tenant_category(uuid,uuid,text,text,text) is 'Validated tenant-role category rename and archive/unarchive lifecycle.';
comment on function public.create_product_variant(uuid,uuid,text,text,bigint,jsonb) is 'Creates a draft variant under a product after tenant and role validation.';
comment on function public.update_product_variant(uuid,uuid,uuid,text,text,bigint,jsonb,text) is 'Validated variant update and draft/published/archive status transition.';
