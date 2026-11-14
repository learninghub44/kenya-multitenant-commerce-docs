-- Bulk catalogue import. One transaction per batch, tenant/role checked in the database,
-- idempotent per import key, and opening stock always goes through the append-only ledger.

create table public.catalogue_imports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete restrict,
  source text not null check (source in ('csv','shopify','woocommerce','google_sheets','url','json','other')),
  import_key text not null check (length(import_key) between 8 and 128),
  duplicate_mode text not null check (duplicate_mode in ('skip','update')),
  rows_received integer not null check (rows_received >= 0),
  products_created integer not null default 0,
  products_updated integer not null default 0,
  rows_skipped integer not null default 0,
  rows_failed integer not null default 0,
  stock_rows_applied integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, import_key)
);
create index catalogue_imports_tenant_created_idx on public.catalogue_imports(tenant_id, created_at desc);

alter table public.catalogue_imports enable row level security;
create policy "catalogue staff can read import history" on public.catalogue_imports
  for select to authenticated
  using (public.has_tenant_role(tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]));
revoke insert, update, delete on public.catalogue_imports from anon, authenticated;

-- p_rows: array of objects { title, slug?, description?, sku?, price_minor, category?, status?, stock? , variant_title?, options? }
-- Rows are validated one by one; invalid rows are reported and skipped, they never abort valid rows.
-- Stock is applied only when the caller may also adjust stock (owner/manager/stock_clerk role set).
create or replace function public.import_catalogue_rows(
  p_tenant_id uuid,
  p_rows jsonb,
  p_duplicate_mode text,
  p_source text,
  p_import_key text,
  p_location_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clean_key text := trim(coalesce(p_import_key, ''));
  existing public.catalogue_imports%rowtype;
  can_stock boolean;
  loc uuid;
  r jsonb;
  idx integer := 0;
  v_title text;
  v_slug text;
  v_desc text;
  v_sku text;
  v_price bigint;
  v_cat text;
  v_cat_slug text;
  v_status text;
  v_stock integer;
  v_variant_title text;
  v_options jsonb;
  v_category_id uuid;
  v_product_id uuid;
  v_variant_id uuid;
  v_existing_variant uuid;
  v_existing_product uuid;
  n_created integer := 0;
  n_updated integer := 0;
  n_skipped integer := 0;
  n_failed integer := 0;
  n_stock integer := 0;
  errs jsonb := '[]'::jsonb;
  total integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not public.has_tenant_role(p_tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]) then
    raise exception 'You do not have permission to manage this catalogue' using errcode = '42501';
  end if;
  if p_duplicate_mode not in ('skip','update') then
    raise exception 'Duplicate handling must be skip or update' using errcode = '22023';
  end if;
  if p_source not in ('csv','shopify','woocommerce','google_sheets','url','json','other') then
    raise exception 'Unknown import source' using errcode = '22023';
  end if;
  if length(clean_key) < 8 or length(clean_key) > 128 then
    raise exception 'A valid import key is required' using errcode = '22023';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Rows must be a JSON array' using errcode = '22023';
  end if;
  total := jsonb_array_length(p_rows);
  if total < 1 or total > 500 then
    raise exception 'Send between 1 and 500 rows per batch' using errcode = '22023';
  end if;

  -- Serialize retries of the same batch, then return the stored result if it already ran.
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text || ':import:' || clean_key, 0));
  select * into existing from public.catalogue_imports where tenant_id = p_tenant_id and import_key = clean_key;
  if found then
    return jsonb_build_object(
      'import_id', existing.id, 'replayed', true,
      'created', existing.products_created, 'updated', existing.products_updated,
      'skipped', existing.rows_skipped, 'failed', existing.rows_failed,
      'stock_applied', existing.stock_rows_applied, 'errors', existing.errors
    );
  end if;

  can_stock := public.has_tenant_role(p_tenant_id, array['owner','manager','stock_clerk']::public.membership_role[]);
  if can_stock then
    if p_location_id is not null then
      select id into loc from public.inventory_locations
      where id = p_location_id and tenant_id = p_tenant_id and active;
    else
      select id into loc from public.inventory_locations
      where tenant_id = p_tenant_id and active order by created_at limit 1;
    end if;
  end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    idx := idx + 1;
    begin
      if jsonb_typeof(r) <> 'object' then
        raise exception 'Row is not an object' using errcode = '22023';
      end if;
      v_title := trim(coalesce(r->>'title', ''));
      v_slug := lower(trim(coalesce(r->>'slug', '')));
      v_desc := coalesce(r->>'description', '');
      v_sku := nullif(trim(coalesce(r->>'sku', '')), '');
      v_cat := nullif(trim(coalesce(r->>'category', '')), '');
      v_status := coalesce(nullif(r->>'status', ''), 'draft');
      v_variant_title := coalesce(nullif(trim(coalesce(r->>'variant_title', '')), ''), 'Default');
      v_options := coalesce(r->'options', '{}'::jsonb);

      if length(v_title) < 1 or length(v_title) > 180 then
        raise exception 'Title must be 1-180 characters' using errcode = '22023';
      end if;
      if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(v_slug) > 180 then
        raise exception 'Invalid product slug' using errcode = '22023';
      end if;
      if length(v_desc) > 10000 then
        raise exception 'Description is too long' using errcode = '22023';
      end if;
      if v_sku is not null and length(v_sku) > 80 then
        raise exception 'SKU must be 80 characters or fewer' using errcode = '22023';
      end if;
      if v_status not in ('draft','published') then
        raise exception 'Status must be draft or published' using errcode = '22023';
      end if;
      if length(v_variant_title) > 180 then
        raise exception 'Variant title is too long' using errcode = '22023';
      end if;
      if jsonb_typeof(v_options) <> 'object' or octet_length(v_options::text) > 4000 then
        raise exception 'Variant options must be a small JSON object' using errcode = '22023';
      end if;
      if jsonb_typeof(r->'price_minor') is distinct from 'number' then
        raise exception 'Price is missing or not a number' using errcode = '22023';
      end if;
      v_price := (r->>'price_minor')::numeric::bigint;
      if (r->>'price_minor')::numeric <> v_price or v_price < 0 or v_price > 1000000000000 then
        raise exception 'Price must be a whole number of cents between 0 and 1,000,000,000,000' using errcode = '22023';
      end if;
      v_stock := null;
      if r ? 'stock' and jsonb_typeof(r->'stock') = 'number' then
        if (r->>'stock')::numeric <> trunc((r->>'stock')::numeric) or (r->>'stock')::numeric < 0 or (r->>'stock')::numeric > 100000000 then
          raise exception 'Stock must be a whole number between 0 and 100,000,000' using errcode = '22023';
        end if;
        v_stock := (r->>'stock')::integer;
      end if;

      -- Category: find by name (case-insensitive) or create. Archived categories are not reused.
      v_category_id := null;
      if v_cat is not null then
        if length(v_cat) > 100 then
          raise exception 'Category name must be 100 characters or fewer' using errcode = '22023';
        end if;
        select id into v_category_id from public.categories
        where tenant_id = p_tenant_id and lower(name) = lower(v_cat) and status <> 'archived'
        order by created_at limit 1;
        if v_category_id is null then
          v_cat_slug := trim(both '-' from regexp_replace(lower(v_cat), '[^a-z0-9]+', '-', 'g'));
          if v_cat_slug = '' then v_cat_slug := 'category'; end if;
          v_cat_slug := left(v_cat_slug, 90);
          insert into public.categories (tenant_id, name, slug, status)
          values (p_tenant_id, v_cat, v_cat_slug, 'published')
          on conflict (tenant_id, slug) do update set name = public.categories.name
          returning id into v_category_id;
        end if;
      end if;

      -- Duplicate detection: SKU first (variant level), then product slug.
      v_existing_variant := null;
      v_existing_product := null;
      if v_sku is not null then
        select id, product_id into v_existing_variant, v_existing_product
        from public.product_variants where tenant_id = p_tenant_id and upper(sku) = upper(v_sku) limit 1;
      end if;
      if v_existing_product is null then
        select id into v_existing_product from public.products where tenant_id = p_tenant_id and slug = v_slug;
      end if;

      if v_existing_product is not null then
        if p_duplicate_mode = 'skip' then
          n_skipped := n_skipped + 1;
          continue;
        end if;
        update public.products
        set title = v_title, description = v_desc,
            category_id = coalesce(v_category_id, category_id), updated_at = now()
        where id = v_existing_product and tenant_id = p_tenant_id and status <> 'archived';
        if not found then
          raise exception 'Matching product is archived' using errcode = '22023';
        end if;
        if v_existing_variant is not null then
          update public.product_variants
          set price_minor = v_price, updated_at = now()
          where id = v_existing_variant and tenant_id = p_tenant_id;
        end if;
        v_product_id := v_existing_product;
        v_variant_id := v_existing_variant;
        n_updated := n_updated + 1;
      else
        insert into public.products (tenant_id, title, slug, description, status, track_inventory, category_id)
        values (p_tenant_id, v_title, v_slug, v_desc, v_status::public.record_status, true, v_category_id)
        returning id into v_product_id;
        insert into public.product_variants (tenant_id, product_id, sku, title, price_minor, currency, options, status)
        values (p_tenant_id, v_product_id, v_sku, v_variant_title, v_price, 'KES', v_options, 'published')
        returning id into v_variant_id;
        n_created := n_created + 1;
      end if;

      -- Opening stock: only for newly created variants, only if the caller may change stock.
      if v_stock is not null and v_stock > 0 and can_stock and loc is not null and v_variant_id is not null
         and v_existing_product is null then
        insert into public.inventory_balances (tenant_id, variant_id, location_id, on_hand, reserved)
        values (p_tenant_id, v_variant_id, loc, v_stock, 0)
        on conflict (tenant_id, variant_id, location_id) do nothing;
        insert into public.inventory_movements (
          tenant_id, variant_id, location_id, quantity_delta, movement_type,
          reason, idempotency_key, actor_user_id
        ) values (
          p_tenant_id, v_variant_id, loc, v_stock, 'opening',
          'Opening stock from catalogue import', 'import:' || clean_key || ':' || v_variant_id::text, auth.uid()
        );
        n_stock := n_stock + 1;
      end if;
    exception
      when others then
        -- The sub-transaction for this row is rolled back automatically; record and move on.
        n_failed := n_failed + 1;
        if jsonb_array_length(errs) < 50 then
          errs := errs || jsonb_build_array(jsonb_build_object('row', idx, 'message',
            case when sqlstate = '23505' then 'Duplicate slug or SKU' else left(sqlerrm, 200) end));
        end if;
    end;
  end loop;

  insert into public.catalogue_imports (
    tenant_id, actor_user_id, source, import_key, duplicate_mode, rows_received,
    products_created, products_updated, rows_skipped, rows_failed, stock_rows_applied, errors
  ) values (
    p_tenant_id, auth.uid(), p_source, clean_key, p_duplicate_mode, total,
    n_created, n_updated, n_skipped, n_failed, n_stock, errs
  ) returning id into existing.id;

  insert into public.audit_events(tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_tenant_id, auth.uid(), 'catalogue.imported', 'catalogue_import', existing.id::text,
    jsonb_build_object('source', p_source, 'received', total, 'created', n_created, 'updated', n_updated,
                       'skipped', n_skipped, 'failed', n_failed));

  return jsonb_build_object(
    'import_id', existing.id, 'replayed', false,
    'created', n_created, 'updated', n_updated, 'skipped', n_skipped,
    'failed', n_failed, 'stock_applied', n_stock, 'errors', errs
  );
end;
$$;

revoke all on function public.import_catalogue_rows(uuid, jsonb, text, text, text, uuid) from public, anon;
grant execute on function public.import_catalogue_rows(uuid, jsonb, text, text, text, uuid) to authenticated;

comment on function public.import_catalogue_rows(uuid, jsonb, text, text, text, uuid) is
  'Tenant-role checked, idempotent bulk catalogue import. Invalid rows are reported, not fatal. Opening stock is written to the append-only ledger.';
