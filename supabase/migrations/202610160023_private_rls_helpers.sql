-- Keep RLS helper RPCs out of the exposed public API schema.
-- SECURITY DEFINER business RPCs can still call public helpers as their owner;
-- policies use the private copies directly, so clients do not need public helper EXECUTE.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_active_tenant_member(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.tenant_memberships m
    join public.tenants t on t.id = m.tenant_id
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.active
      and t.status = 'active'
  );
$$;

create or replace function private.has_tenant_role(
  target_tenant uuid,
  allowed_roles public.membership_role[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.tenant_memberships m
    join public.tenants t on t.id = m.tenant_id
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.active
      and t.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function private.is_active_tenant_member(uuid) from public, anon;
revoke all on function private.has_tenant_role(uuid, public.membership_role[]) from public, anon;
grant execute on function private.is_active_tenant_member(uuid) to authenticated;
grant execute on function private.has_tenant_role(uuid, public.membership_role[]) to authenticated;

-- Rewrite existing RLS policies to use the non-exposed schema helper functions.
do $$
declare
  pol record;
  roles_sql text;
  using_sql text;
  check_sql text;
  new_qual text;
  new_check text;
  statement text;
begin
  for pol in
    select *
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%public.is_active_tenant_member%'
        or coalesce(qual, '') like '%public.has_tenant_role%'
        or coalesce(with_check, '') like '%public.is_active_tenant_member%'
        or coalesce(with_check, '') like '%public.has_tenant_role%'
      )
  loop
    select string_agg(quote_ident(role_name), ', ')
      into roles_sql
      from unnest(pol.roles) as role_name;

    new_qual := replace(replace(pol.qual,
      'public.is_active_tenant_member', 'private.is_active_tenant_member'),
      'public.has_tenant_role', 'private.has_tenant_role');
    new_check := replace(replace(pol.with_check,
      'public.is_active_tenant_member', 'private.is_active_tenant_member'),
      'public.has_tenant_role', 'private.has_tenant_role');

    using_sql := case when pol.qual is not null then ' USING (' || new_qual || ')' else '' end;
    check_sql := case when pol.with_check is not null then ' WITH CHECK (' || new_check || ')' else '' end;

    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    statement := format(
      'create policy %I on %I.%I as %s for %s to %s%s%s',
      pol.policyname, pol.schemaname, pol.tablename, pol.permissive, pol.cmd,
      coalesce(roles_sql, 'public'), using_sql, check_sql
    );
    execute statement;
  end loop;
end;
$$;

-- The exposed wrappers are not an RPC surface. SECURITY DEFINER domain RPCs
-- execute as their owner and retain access; RLS now calls private helpers.
revoke all on function public.is_active_tenant_member(uuid) from public, anon, authenticated;
revoke all on function public.has_tenant_role(uuid, public.membership_role[]) from public, anon, authenticated;
