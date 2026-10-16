-- Structural security regression tests. Run after migrations with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(15);

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

select * from extensions.finish();
rollback;
