-- Narrow public read surface: anonymous visitors can see only active stores,
-- published products, published variants, published categories, and public image metadata.
create or replace function public.get_public_storefront(p_store_slug text)
returns table (
  store_name text,
  store_slug text,
  product_id uuid,
  product_title text,
  product_slug text,
  product_description text,
  category_name text,
  variant_id uuid,
  variant_title text,
  sku text,
  price_minor bigint,
  currency char(3),
  available_quantity bigint,
  images jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    t.name,
    t.slug,
    p.id,
    p.title,
    p.slug,
    p.description,
    c.name,
    v.id,
    v.title,
    v.sku,
    v.price_minor,
    v.currency,
    case when p.track_inventory then coalesce(sum(greatest(b.on_hand - b.reserved, 0)), 0)::bigint else null::bigint end,
    coalesce((
      select jsonb_agg(jsonb_build_object('url', pi.secure_url, 'alt', pi.alt_text, 'position', pi.position) order by pi.position)
      from public.product_images pi
      where pi.tenant_id = p.tenant_id and pi.product_id = p.id
    ), '[]'::jsonb)
  from public.tenants t
  join public.products p on p.tenant_id = t.id and p.status = 'published'
  join public.product_variants v on v.tenant_id = p.tenant_id and v.product_id = p.id and v.status = 'published'
  left join public.categories c on c.tenant_id = p.tenant_id and c.id = p.category_id and c.status = 'published'
  left join public.inventory_balances b on b.tenant_id = v.tenant_id and b.variant_id = v.id
  where t.slug = lower(trim(coalesce(p_store_slug,'')))
    and t.status = 'active'
    and (p.category_id is null or c.id is not null)
  group by t.name, t.slug, p.id, p.title, p.slug, p.description, p.track_inventory,
           c.name, v.id, v.title, v.sku, v.price_minor, v.currency
  order by p.title, v.title;
$$;

revoke all on function public.get_public_storefront(text) from public;
grant execute on function public.get_public_storefront(text) to anon, authenticated;
comment on function public.get_public_storefront(text) is
  'Public storefront read model. Exposes published catalogue only; never exposes tenant-private customer, inventory ledger, order, or payment records.';
