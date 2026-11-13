-- Phase 1 foundations: let a signed-in member resolve their OWN access to a
-- workspace even when the tenant is suspended or closed.
--
-- Why: RLS on public.tenants and is_active_tenant_member() only expose ACTIVE
-- tenants, so the app could not tell "workspace suspended" apart from "workspace
-- does not exist / you are not a member" and had to return a 404 for both.
--
-- Safety properties:
--   * auth.uid() is derived inside the function; the browser never sends a user id.
--   * Only rows where the caller has an ACTIVE membership are returned, so a
--     non-member learns nothing about whether a slug exists.
--   * Read-only, no write path, no widening of any table policy.
--   * Status is returned so the app can show a "workspace unavailable" page;
--     authorization for data access still relies on RLS (active tenants only).

create or replace function public.get_workspace_access(p_slug text)
returns table(
  tenant_id uuid,
  name text,
  slug text,
  status public.tenant_status,
  currency char(3),
  role public.membership_role
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select t.id, t.name, t.slug, t.status, t.currency, m.role
  from public.tenants t
  join public.tenant_memberships m on m.tenant_id = t.id
  where auth.uid() is not null
    and t.slug = p_slug
    and m.user_id = auth.uid()
    and m.active
  limit 1;
$$;

revoke all on function public.get_workspace_access(text) from public, anon;
grant execute on function public.get_workspace_access(text) to authenticated;
