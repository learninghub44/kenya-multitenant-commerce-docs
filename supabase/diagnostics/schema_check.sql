-- Read-only. Paste into the Supabase SQL editor to see which database objects the app expects
-- but the live database is missing. Any row with exists = false means the matching migration
-- (named in the last column) has not been applied to this database.
select * from (values
  ('table store_profiles',                 to_regclass('public.store_profiles') is not null,                 '202610170001_store_profiles_and_reserved_slugs'),
  ('table catalogue_imports',              to_regclass('public.catalogue_imports') is not null,              '202611130002_catalogue_import'),
  ('table tenant_payment_connections',     to_regclass('public.tenant_payment_connections') is not null,     '20261111195000_tenant_payment_connections'),
  ('table audit_events',                   to_regclass('public.audit_events') is not null,                   '202610160008_commerce_erp_domain'),
  ('table product_images',                 to_regclass('public.product_images') is not null,                 '202610160010_product_images'),
  ('fn release_expired_reservations_for_tenant', to_regprocedure('public.release_expired_reservations_for_tenant(uuid)') is not null, '202610160013_expiring_checkout_reservations'),
  ('fn refresh_public_store_reservations', to_regprocedure('public.refresh_public_store_reservations(text)') is not null, '202610160017_public_stock_refresh'),
  ('fn get_public_storefront',             to_regprocedure('public.get_public_storefront(text)') is not null, '202610160011 / 0017 / 0018'),
  ('fn get_public_store_profile',          to_regprocedure('public.get_public_store_profile(text)') is not null, '202610170001_store_profiles_and_reserved_slugs'),
  ('fn import_catalogue_rows',             to_regprocedure('public.import_catalogue_rows(uuid,jsonb,text,text,text,uuid)') is not null, '202611130002_catalogue_import'),
  ('fn record_inventory_movement',         to_regprocedure('public.record_inventory_movement(uuid,uuid,uuid,integer,text,text,text)') is not null, '202610160004_inventory_operations')
) as t(object_name, "exists", migration)
order by "exists", object_name;

-- Which migration versions does Supabase itself think are applied?
select version, name from supabase_migrations.schema_migrations order by version;
