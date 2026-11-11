begin;
select extensions.plan(11);

select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.tenant_invitations'::regclass)
  and not exists(select 1 from pg_policies where schemaname='public' and tablename='tenant_invitations'),
  'team invitations are protected by RLS without direct client policies'
);

select extensions.ok(
  not has_function_privilege('anon','public.create_tenant_invitation(uuid,text,public.membership_role)','EXECUTE')
  and has_function_privilege('authenticated','public.create_tenant_invitation(uuid,text,public.membership_role)','EXECUTE'),
  'only authenticated users can request team invitations'
);

select extensions.ok(
  not has_function_privilege('anon','public.accept_tenant_invitation(text)','EXECUTE')
  and has_function_privilege('authenticated','public.accept_tenant_invitation(text)','EXECUTE'),
  'only authenticated users can accept team invitations'
);

select extensions.ok(
  position('A workspace must keep at least one active owner' in pg_get_functiondef('public.set_tenant_member_role(uuid,uuid,public.membership_role)'::regprocedure)) > 0
  and position('A workspace must keep at least one active owner' in pg_get_functiondef('public.remove_tenant_member(uuid,uuid)'::regprocedure)) > 0,
  'team RPCs prevent demoting or removing the last active owner'
);

select extensions.ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef('public.set_tenant_member_role(uuid,uuid,public.membership_role)'::regprocedure)) > 0
  and position('pg_advisory_xact_lock' in pg_get_functiondef('public.remove_tenant_member(uuid,uuid)'::regprocedure)) > 0,
  'owner-count changes are serialized per tenant to prevent concurrent last-owner removal'
);

select extensions.ok(
  not has_function_privilege('anon','public.list_tenant_audit_events(uuid,integer)','EXECUTE')
  and has_function_privilege('authenticated','public.list_tenant_audit_events(uuid,integer)','EXECUTE')
  and position('has_tenant_role' in pg_get_functiondef('public.list_tenant_audit_events(uuid,integer)'::regprocedure)) > 0,
  'audit history is exposed only through the authenticated owner-checked read RPC'
);

select extensions.ok(
  not has_function_privilege('anon','public.list_tenant_team(uuid)','EXECUTE')
  and has_function_privilege('authenticated','public.list_tenant_team(uuid)','EXECUTE')
  and position('has_tenant_role' in pg_get_functiondef('public.list_tenant_team(uuid)'::regprocedure)) > 0,
  'team membership details are available only to authenticated workspace owners'
);

select extensions.ok(
  position('auth.jwt()' in pg_get_functiondef('public.accept_tenant_invitation(text)'::regprocedure)) > 0
  and position('invite.email' in pg_get_functiondef('public.accept_tenant_invitation(text)'::regprocedure)) > 0,
  'invitation acceptance verifies the signed-in account email'
);

select extensions.ok(
  position('interval ''7 days''' in pg_get_functiondef('public.create_tenant_invitation(uuid,text,public.membership_role)'::regprocedure)) > 0
  and position('digest(raw_token' in pg_get_functiondef('public.create_tenant_invitation(uuid,text,public.membership_role)'::regprocedure)) > 0,
  'invitation tokens are hashed at rest and expire after seven days'
);

select extensions.ok(
  not exists(select 1 from pg_policies where schemaname='public' and tablename='tenant_memberships' and cmd in ('ALL','INSERT','UPDATE','DELETE')),
  'tenant membership changes remain unavailable through direct client table writes'
);

select extensions.ok(
  not has_function_privilege('anon','public.set_tenant_member_role(uuid,uuid,public.membership_role)','EXECUTE')
  and not has_function_privilege('anon','public.remove_tenant_member(uuid,uuid)','EXECUTE')
  and has_function_privilege('authenticated','public.set_tenant_member_role(uuid,uuid,public.membership_role)','EXECUTE')
  and has_function_privilege('authenticated','public.remove_tenant_member(uuid,uuid)','EXECUTE'),
  'membership role changes and removals require authenticated RPCs'
);

select * from extensions.finish();
rollback;
