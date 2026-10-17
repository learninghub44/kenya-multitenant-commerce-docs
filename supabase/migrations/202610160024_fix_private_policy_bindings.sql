-- Repair policy expression rewriting for catalogs that deparse public function calls
-- without schema qualification. Ensure every policy uses private RLS helpers before
-- removing authenticated EXECUTE from the public helper functions.

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
        coalesce(qual, '') like '%is_active_tenant_member%'
        or coalesce(qual, '') like '%has_tenant_role%'
        or coalesce(with_check, '') like '%is_active_tenant_member%'
        or coalesce(with_check, '') like '%has_tenant_role%'
      )
  loop
    select string_agg(quote_ident(role_name), ', ')
      into roles_sql
      from unnest(pol.roles) as role_name;

    new_qual := pol.qual;
    new_check := pol.with_check;

    if new_qual is not null then
      new_qual := replace(new_qual, 'public.is_active_tenant_member(', 'private.is_active_tenant_member(');
      new_qual := replace(new_qual, 'is_active_tenant_member(', 'private.is_active_tenant_member(');
      new_qual := replace(new_qual, 'public.has_tenant_role(', 'private.has_tenant_role(');
      new_qual := replace(new_qual, 'has_tenant_role(', 'private.has_tenant_role(');
      new_qual := replace(new_qual, 'private.private.is_active_tenant_member(', 'private.is_active_tenant_member(');
      new_qual := replace(new_qual, 'private.private.has_tenant_role(', 'private.has_tenant_role(');
    end if;

    if new_check is not null then
      new_check := replace(new_check, 'public.is_active_tenant_member(', 'private.is_active_tenant_member(');
      new_check := replace(new_check, 'is_active_tenant_member(', 'private.is_active_tenant_member(');
      new_check := replace(new_check, 'public.has_tenant_role(', 'private.has_tenant_role(');
      new_check := replace(new_check, 'has_tenant_role(', 'private.has_tenant_role(');
      new_check := replace(new_check, 'private.private.is_active_tenant_member(', 'private.is_active_tenant_member(');
      new_check := replace(new_check, 'private.private.has_tenant_role(', 'private.has_tenant_role(');
    end if;

    select string_agg(quote_ident(role_name), ', ')
      into roles_sql
      from unnest(pol.roles) as role_name;

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

-- Defense in depth: no direct public helper RPC execution for either client role.
revoke all on function public.is_active_tenant_member(uuid) from public, anon, authenticated;
revoke all on function public.has_tenant_role(uuid, public.membership_role[]) from public, anon, authenticated;
