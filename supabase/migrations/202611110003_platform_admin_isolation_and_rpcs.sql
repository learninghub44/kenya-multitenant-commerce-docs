-- Separate platform-operator identity and narrow administration RPCs.
-- Tenant membership never grants platform-admin access.

create type public.platform_admin_role as enum ('super_admin', 'operations_admin', 'support_admin');

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role public.platform_admin_role not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_admin_audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (length(action) between 1 and 120),
  tenant_id uuid references public.tenants(id) on delete restrict,
  reason text not null check (length(trim(reason)) between 10 and 500),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index platform_admin_audit_created_idx on public.platform_admin_audit_events(created_at desc);
alter table public.platform_admins enable row level security;
alter table public.platform_admin_audit_events enable row level security;

create policy platform_admin_self_read_aal2
on public.platform_admins for select to authenticated
using (user_id = auth.uid() and auth.jwt()->>'aal' = 'aal2');
-- No client write policies and no direct client audit policies.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null
    and auth.jwt()->>'aal' = 'aal2'
    and exists (
      select 1 from public.platform_admins p
      where p.user_id = auth.uid() and p.active
    );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.platform_admin_list_tenants(p_search text default null, p_limit integer default 50)
returns table(tenant_id uuid, tenant_name text, tenant_slug text, tenant_status public.tenant_status, created_at timestamptz, active_members bigint)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access with MFA is required' using errcode = '42501';
  end if;
  return query
    select t.id, t.name, t.slug, t.status, t.created_at,
      (select count(*) from public.tenant_memberships m where m.tenant_id = t.id and m.active)
    from public.tenants t
    where nullif(trim(coalesce(p_search, '')), '') is null
      or t.name ilike '%' || trim(p_search) || '%'
      or t.slug ilike '%' || trim(p_search) || '%'
    order by t.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

create or replace function public.platform_admin_set_tenant_status(
  p_tenant_id uuid,
  p_status public.tenant_status,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  admin_role public.platform_admin_role;
  previous_status public.tenant_status;
  clean_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access with MFA is required' using errcode = '42501';
  end if;
  select p.role into admin_role from public.platform_admins p
  where p.user_id = auth.uid() and p.active;
  if admin_role not in ('super_admin', 'operations_admin') then
    raise exception 'Your platform role cannot change tenant status' using errcode = '42501';
  end if;
  if p_status not in ('active', 'suspended') then
    raise exception 'Only active or suspended status can be selected' using errcode = '22023';
  end if;
  if length(clean_reason) < 10 or length(clean_reason) > 500 then
    raise exception 'Provide a reason between 10 and 500 characters' using errcode = '22023';
  end if;
  select t.status into previous_status from public.tenants t where t.id = p_tenant_id for update;
  if not found then raise exception 'Tenant not found' using errcode = 'P0002'; end if;
  if previous_status = p_status then
    raise exception 'Tenant already has that status' using errcode = '22023';
  end if;

  update public.tenants set status = p_status, updated_at = now() where id = p_tenant_id;
  insert into public.platform_admin_audit_events(actor_user_id, action, tenant_id, reason, metadata)
  values (auth.uid(), 'tenant.status_changed', p_tenant_id, clean_reason,
    jsonb_build_object('from', previous_status::text, 'to', p_status::text));
end;
$$;

create or replace function public.platform_admin_list_audit_events(p_limit integer default 100)
returns table(event_id bigint, actor_email text, action text, tenant_name text, reason text, occurred_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Platform administrator access with MFA is required' using errcode = '42501';
  end if;
  return query
    select a.id, u.email::text, a.action, t.name, a.reason, a.created_at
    from public.platform_admin_audit_events a
    left join auth.users u on u.id = a.actor_user_id
    left join public.tenants t on t.id = a.tenant_id
    order by a.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 200));
end;
$$;

revoke all on function public.platform_admin_list_tenants(text,integer) from public, anon;
revoke all on function public.platform_admin_set_tenant_status(uuid,public.tenant_status,text) from public, anon;
revoke all on function public.platform_admin_list_audit_events(integer) from public, anon;
grant execute on function public.platform_admin_list_tenants(text,integer) to authenticated;
grant execute on function public.platform_admin_set_tenant_status(uuid,public.tenant_status,text) to authenticated;
grant execute on function public.platform_admin_list_audit_events(integer) to authenticated;

comment on table public.platform_admins is
  'Separate platform-operator allowlist. Provision accounts manually after MFA enrollment; tenant memberships never confer platform access.';
