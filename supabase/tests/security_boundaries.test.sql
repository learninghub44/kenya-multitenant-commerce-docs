-- Structural security regression tests. Run after migrations with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(21);

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
  not has_function_privilege('anon','public.is_active_tenant_member(uuid)','EXECUTE')
  and not has_function_privilege('anon','public.has_tenant_role(uuid,public.membership_role[])','EXECUTE'),
  'anonymous users cannot call tenant authorization helper functions'
);

select extensions.ok(
  not has_function_privilege('anon','public.refresh_public_store_reservations(text)','EXECUTE')
  and not has_function_privilege('authenticated','public.refresh_public_store_reservations(text)','EXECUTE'),
  'reservation cleanup cannot be triggered directly through the public API'
);

select extensions.ok(
  (select count(*)=1 from pg_policies
   where schemaname='public' and tablename='inventory_locations'
     and cmd='SELECT' and roles @> array['authenticated']::name[]),
  'inventory locations have only one permissive SELECT policy'
);


select extensions.ok(
  not has_function_privilege('authenticated','public.is_active_tenant_member(uuid)','EXECUTE')
  and not has_function_privilege('authenticated','public.has_tenant_role(uuid,public.membership_role[])','EXECUTE')
  and has_function_privilege('authenticated','private.is_active_tenant_member(uuid)','EXECUTE')
  and has_function_privilege('authenticated','private.has_tenant_role(uuid,public.membership_role[])','EXECUTE'),
  'RLS helper functions are callable only through private schema policies, not public RPCs'
);

select extensions.ok(
  not has_schema_privilege('anon','private','USAGE')
  and has_schema_privilege('authenticated','private','USAGE'),
  'private schema is unavailable to anonymous clients and available to authenticated RLS evaluation'
);


select extensions.ok(
  not exists (
    select 1
    from pg_policy pol
    join pg_depend d on d.classid='pg_policy'::regclass and d.objid=pol.oid and d.refclassid='pg_proc'::regclass
    join pg_proc fn on fn.oid=d.refobjid
    join pg_namespace ns on ns.oid=fn.pronamespace
    where pol.polrelid in (
      select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
    )
      and ns.nspname='public'
      and fn.proname in ('is_active_tenant_member','has_tenant_role')
  )
  and exists (
    select 1
    from pg_policy pol
    join pg_depend d on d.classid='pg_policy'::regclass and d.objid=pol.oid and d.refclassid='pg_proc'::regclass
    join pg_proc fn on fn.oid=d.refobjid
    join pg_namespace ns on ns.oid=fn.pronamespace
    where pol.polrelid in (
      select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
    )
      and ns.nspname='private'
      and fn.proname in ('is_active_tenant_member','has_tenant_role')
  ),
  'tenant RLS policies bind to private helpers rather than public RPC functions'
);

select * from extensions.finish();
rollback;
