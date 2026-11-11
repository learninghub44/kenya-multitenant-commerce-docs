begin;
select extensions.plan(7);

select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.platform_admins'::regclass)
  and (select relrowsecurity from pg_class where oid = 'public.platform_admin_audit_events'::regclass),
  'platform admin identities and platform audit history have RLS enabled'
);

select extensions.ok(
  not exists(select 1 from pg_policies where schemaname='public' and tablename='platform_admin_audit_events'),
  'platform audit history has no direct client policies'
);

select extensions.ok(
  not exists(select 1 from pg_policies where schemaname='public' and tablename='platform_admins' and cmd in ('ALL','INSERT','UPDATE','DELETE')),
  'platform admin grants cannot be written by browser clients'
);

select extensions.ok(
  position('aal2' in pg_get_functiondef('public.is_platform_admin()'::regprocedure)) > 0
  and position('platform_admins' in pg_get_functiondef('public.is_platform_admin()'::regprocedure)) > 0
  and position('tenant_memberships' in pg_get_functiondef('public.is_platform_admin()'::regprocedure)) = 0,
  'platform access is MFA-gated and independent of tenant membership'
);

select extensions.ok(
  not has_function_privilege('anon','public.platform_admin_list_tenants(text,integer)','EXECUTE')
  and has_function_privilege('authenticated','public.platform_admin_list_tenants(text,integer)','EXECUTE')
  and position('is_platform_admin' in pg_get_functiondef('public.platform_admin_list_tenants(text,integer)'::regprocedure)) > 0,
  'tenant summaries require the MFA-verified platform admin RPC'
);

select extensions.ok(
  position('super_admin' in pg_get_functiondef('public.platform_admin_set_tenant_status(uuid,public.tenant_status,text)'::regprocedure)) > 0
  and position('operations_admin' in pg_get_functiondef('public.platform_admin_set_tenant_status(uuid,public.tenant_status,text)'::regprocedure)) > 0
  and position('platform_admin_audit_events' in pg_get_functiondef('public.platform_admin_set_tenant_status(uuid,public.tenant_status,text)'::regprocedure)) > 0,
  'tenant suspension and reactivation are role-limited and audited with a reason'
);

select extensions.ok(
  not has_function_privilege('anon','public.platform_admin_list_audit_events(integer)','EXECUTE')
  and has_function_privilege('authenticated','public.platform_admin_list_audit_events(integer)','EXECUTE')
  and position('is_platform_admin' in pg_get_functiondef('public.platform_admin_list_audit_events(integer)'::regprocedure)) > 0,
  'platform audit history is available only through MFA-gated authenticated RPCs'
);

select * from extensions.finish();
rollback;
