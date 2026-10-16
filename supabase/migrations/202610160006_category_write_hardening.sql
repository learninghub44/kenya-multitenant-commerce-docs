-- Category changes are validated in the database, like product writes.
drop policy if exists "catalog staff can manage categories" on public.categories;

create or replace function public.create_tenant_category(
  p_tenant_id uuid,
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clean_name text := trim(coalesce(p_name, ''));
  clean_slug text := lower(trim(coalesce(p_slug, '')));
  new_category_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not public.has_tenant_role(
    p_tenant_id,
    array['owner','manager','catalog_editor']::public.membership_role[]
  ) then
    raise exception 'You do not have permission to manage categories' using errcode = '42501';
  end if;
  if length(clean_name) < 1 or length(clean_name) > 100 then
    raise exception 'Category name must be between 1 and 100 characters' using errcode = '22023';
  end if;
  if clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(clean_slug) > 100 then
    raise exception 'Use a valid category slug with lowercase letters, numbers and hyphens' using errcode = '22023';
  end if;

  insert into public.categories (tenant_id, name, slug, status)
  values (p_tenant_id, clean_name, clean_slug, 'published')
  returning id into new_category_id;
  return new_category_id;
exception
  when unique_violation then
    raise exception 'A category with this slug already exists in this business' using errcode = '23505';
end;
$$;

revoke all on function public.create_tenant_category(uuid, text, text) from public, anon;
grant execute on function public.create_tenant_category(uuid, text, text) to authenticated;
