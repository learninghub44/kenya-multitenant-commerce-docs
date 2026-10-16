-- Tenant onboarding must create the tenant and its owner membership atomically.
-- The browser never receives service-role credentials and cannot assign arbitrary roles.
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

  return new_tenant_id;
exception
  when unique_violation then
    raise exception 'That store address is already taken. Choose another one.' using errcode = '23505';
end;
$$;

revoke all on function public.create_tenant_for_current_user(text, text) from public, anon;
grant execute on function public.create_tenant_for_current_user(text, text) to authenticated;
