begin;
select extensions.plan(3);

select extensions.ok(
  not has_function_privilege('anon','public.get_workspace_access(text)','EXECUTE')
  and has_function_privilege('authenticated','public.get_workspace_access(text)','EXECUTE'),
  'only authenticated users can resolve workspace access'
);

select extensions.ok(
  (select prosecdef from pg_proc where oid = 'public.get_workspace_access(text)'::regprocedure)
  and position('auth.uid()' in pg_get_functiondef('public.get_workspace_access(text)'::regprocedure)) > 0
  and position('m.user_id = auth.uid()' in pg_get_functiondef('public.get_workspace_access(text)'::regprocedure)) > 0
  and position('m.active' in pg_get_functiondef('public.get_workspace_access(text)'::regprocedure)) > 0,
  'workspace access derives auth.uid() server-side and requires an active membership, so non-members learn nothing'
);

select extensions.ok(
  (select provolatile = 's' from pg_proc where oid = 'public.get_workspace_access(text)'::regprocedure)
  and position('insert' in lower(pg_get_functiondef('public.get_workspace_access(text)'::regprocedure))) = 0
  and position('update' in lower(pg_get_functiondef('public.get_workspace_access(text)'::regprocedure))) = 0
  and position('delete' in lower(pg_get_functiondef('public.get_workspace_access(text)'::regprocedure))) = 0,
  'workspace access is a stable, read-only function'
);

select * from extensions.finish();
rollback;
