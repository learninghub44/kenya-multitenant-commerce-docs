-- Structural security regression tests. Run after migrations with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(31);

select extensions.ok(
  (select count(*) = 22 from pg_class c
   join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname = any(array[
     'tenants','tenant_memberships','categories','products','product_variants',
     'inventory_locations','inventory_balances','inventory_movements','product_images',
     'customers','suppliers','orders','order_items','purchase_orders','purchase_order_items',
     'goods_receipts','goods_receipt_items','expenses','payment_transactions','payment_events','audit_events','notification_outbox'
   ]) and c.relrowsecurity),
  'core tenant and commerce tables have row-level security enabled'
);

select extensions.ok(
  not exists(select 1 from pg_policies
    where schemaname='public'
      and tablename = any(array[
        'categories','products','product_variants','product_images','customers','suppliers',
        'orders','order_items','purchase_orders','purchase_order_items','goods_receipts',
        'goods_receipt_items','expenses','payment_transactions','audit_events'
      ])
      and cmd in ('ALL','INSERT','UPDATE','DELETE')),
  'sensitive commerce tables have no direct client write policies'
);

select extensions.ok(
  not exists(select 1 from pg_policies where schemaname='public' and tablename in ('payment_events','notification_outbox')),
  'payment webhook inbox and notification outbox have no client-facing RLS policies'
);

select extensions.ok(
  (select count(*)=4 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname=any(array['payment_events','audit_events','notification_outbox','goods_receipt_items']) and c.relrowsecurity),
  'audit, webhook, outbox and receipt-line tables have RLS enabled'
);

select extensions.ok(
  has_function_privilege('anon','public.get_public_storefront(text)','EXECUTE'),
  'anonymous visitors can execute the narrow published-storefront read function'
);

select extensions.ok(
  has_function_privilege('anon','public.create_public_order(text,jsonb,text,text,text,text)','EXECUTE'),
  'anonymous visitors can submit public orders through the validated checkout RPC'
);

select extensions.ok(
  not has_function_privilege('anon','public.record_inventory_movement(uuid,uuid,uuid,integer,text,text,text)','EXECUTE'),
  'anonymous users cannot invoke inventory adjustment RPC'
);

select extensions.ok(
  not has_function_privilege('anon','public.register_product_image(uuid,uuid,text,text,text,integer)','EXECUTE'),
  'anonymous users cannot register product images'
);

select extensions.ok(
  not has_function_privilege('anon','public.record_manual_order_payment(uuid,uuid,text,text)','EXECUTE'),
  'anonymous users cannot attest to payment receipt'
);

select extensions.ok(
  not has_function_privilege('anon','public.transition_order_status(uuid,uuid,text,text)','EXECUTE'),
  'anonymous users cannot change order fulfilment state'
);

select extensions.ok(
  has_function_privilege('authenticated','public.create_product_variant(uuid,uuid,text,text,bigint,jsonb)','EXECUTE'),
  'authenticated users can manage variants only through role-checked RPC'
);

select extensions.ok(
  has_function_privilege('authenticated','public.receive_purchase_order_line(uuid,uuid,uuid,uuid,integer,text,text,text)','EXECUTE'),
  'authenticated users can post goods receipts through the role-checked RPC'
);

select extensions.ok(
  not has_function_privilege('anon','public.create_tenant_expense(uuid,text,text,bigint,date,text,text)','EXECUTE'),
  'anonymous users cannot create expense records'
);

select extensions.ok(
  position('Terminal orders cannot be transitioned again' in pg_get_functiondef('public.transition_order_status(uuid,uuid,text,text)'::regprocedure)) > 0,
  'order transition RPC rejects repeat transitions on terminal orders'
);

select extensions.ok(
  position('reserved>=order_line.quantity' in pg_get_functiondef('public.release_expired_reservations_for_tenant(uuid)'::regprocedure)) > 0,
  'reservation expiry refuses to clamp inconsistent stock balances'
);

select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.store_profiles'::regclass),
  'store profiles have row-level security enabled'
);

select extensions.ok(
  not exists(select 1 from pg_policies where schemaname='public' and tablename='store_profiles' and cmd in ('ALL','INSERT','UPDATE','DELETE')),
  'store profiles have no direct client write policies'
);

select extensions.ok(
  not has_function_privilege('anon','public.save_store_profile(uuid,jsonb)','EXECUTE')
  and has_function_privilege('authenticated','public.save_store_profile(uuid,jsonb)','EXECUTE'),
  'only authenticated users can call the role-checked store profile writer'
);

select extensions.ok(
  has_function_privilege('anon','public.get_public_store_profile(text)','EXECUTE'),
  'anonymous visitors can read the narrow public store profile'
);

select extensions.ok(
  position('has_tenant_role' in pg_get_functiondef('public.save_store_profile(uuid,jsonb)'::regprocedure)) > 0
  and position('reserved' in pg_get_functiondef('public.create_tenant_for_current_user(text,text)'::regprocedure)) > 0,
  'store profile writes are role-checked and reserved subdomains are rejected at tenant creation'
);

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
