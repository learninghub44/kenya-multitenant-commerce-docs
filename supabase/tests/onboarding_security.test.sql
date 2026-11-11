begin;
select extensions.plan(3);

select extensions.ok(
  not has_function_privilege('anon','public.is_store_slug_available(text)','EXECUTE')
  and has_function_privilege('authenticated','public.is_store_slug_available(text)','EXECUTE'),
  'only authenticated users can preflight store slug availability'
);

select extensions.ok(
  not has_function_privilege('anon','public.create_tenant_with_profile_for_current_user(text,text,jsonb)','EXECUTE')
  and has_function_privilege('authenticated','public.create_tenant_with_profile_for_current_user(text,text,jsonb)','EXECUTE'),
  'only authenticated users can atomically create a workspace and its public profile'
);

select extensions.ok(
  position('auth.uid()' in pg_get_functiondef('public.create_tenant_with_profile_for_current_user(text,text,jsonb)'::regprocedure)) > 0
  and position('create_tenant_for_current_user' in pg_get_functiondef('public.create_tenant_with_profile_for_current_user(text,text,jsonb)'::regprocedure)) > 0
  and position('save_store_profile' in pg_get_functiondef('public.create_tenant_with_profile_for_current_user(text,text,jsonb)'::regprocedure)) > 0,
  'workspace and profile creation use authenticated RPCs in one transaction'
);

select * from extensions.finish();
rollback;
