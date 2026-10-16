-- Product category assignment is an explicit, tenant-authorized operation.
-- The composite FK on products enforces that a category belongs to the same tenant.
create or replace function public.set_product_category(
  p_tenant_id uuid,
  p_product_id uuid,
  p_category_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
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
  if not exists (
    select 1 from public.products p
    where p.id = p_product_id and p.tenant_id = p_tenant_id
  ) then
    raise exception 'Product not found in this workspace' using errcode = 'P0002';
  end if;
  if p_category_id is not null and not exists (
    select 1 from public.categories c
    where c.id = p_category_id and c.tenant_id = p_tenant_id and c.status = 'published'
  ) then
    raise exception 'Choose an active category from this business' using errcode = '22023';
  end if;

  update public.products
  set category_id = p_category_id, updated_at = now()
  where id = p_product_id and tenant_id = p_tenant_id;
exception
  when foreign_key_violation then
    raise exception 'The selected category is not available for this business' using errcode = '23503';
end;
$$;

revoke all on function public.set_product_category(uuid, uuid, uuid) from public, anon;
grant execute on function public.set_product_category(uuid, uuid, uuid) to authenticated;
