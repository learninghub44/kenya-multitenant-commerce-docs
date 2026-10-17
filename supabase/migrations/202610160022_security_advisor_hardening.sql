-- Close unintended public RPC grants, remove duplicate permissive read policy,
-- and index child-side foreign keys identified by Supabase's performance advisor.

-- These helpers are used by RLS policies and trusted RPCs. They must not be
-- callable by anonymous clients; authenticated execution remains for RLS checks.
revoke all on function public.is_active_tenant_member(uuid) from public, anon;
revoke all on function public.has_tenant_role(uuid, public.membership_role[]) from public, anon;

-- No application code calls this maintenance RPC directly. Do not let public
-- requests trigger tenant-wide reservation cleanup and potentially amplify load.
revoke all on function public.refresh_public_store_reservations(text) from public, anon, authenticated;

-- Avoid a broad ALL policy adding a second permissive SELECT policy.
drop policy if exists "owners and managers manage locations" on public.inventory_locations;
create policy "owners and managers insert locations"
  on public.inventory_locations for insert to authenticated
  with check (public.has_tenant_role(tenant_id, array['owner','manager']::public.membership_role[]));
create policy "owners and managers update locations"
  on public.inventory_locations for update to authenticated
  using (public.has_tenant_role(tenant_id, array['owner','manager']::public.membership_role[]))
  with check (public.has_tenant_role(tenant_id, array['owner','manager']::public.membership_role[]));
create policy "owners and managers delete locations"
  on public.inventory_locations for delete to authenticated
  using (public.has_tenant_role(tenant_id, array['owner','manager']::public.membership_role[]));

-- Index child-side foreign keys to keep deletes, updates and joins efficient.
create index if not exists audit_events_actor_user_id_idx
  on public.audit_events(actor_user_id);
create index if not exists expenses_created_by_idx
  on public.expenses(created_by);
create index if not exists goods_receipt_items_purchase_order_item_idx
  on public.goods_receipt_items(tenant_id, purchase_order_item_id);
create index if not exists goods_receipts_received_by_idx
  on public.goods_receipts(received_by);
create index if not exists goods_receipts_tenant_location_idx
  on public.goods_receipts(tenant_id, location_id);
create index if not exists goods_receipts_tenant_purchase_order_idx
  on public.goods_receipts(tenant_id, purchase_order_id);
create index if not exists inventory_balances_tenant_location_idx
  on public.inventory_balances(tenant_id, location_id);
create index if not exists inventory_movements_actor_user_id_idx
  on public.inventory_movements(actor_user_id);
create index if not exists inventory_movements_tenant_location_idx
  on public.inventory_movements(tenant_id, location_id);
create index if not exists order_items_tenant_variant_idx
  on public.order_items(tenant_id, variant_id);
create index if not exists orders_tenant_customer_idx
  on public.orders(tenant_id, customer_id);
create index if not exists payment_events_transaction_id_idx
  on public.payment_events(transaction_id);
create index if not exists products_tenant_category_idx
  on public.products(tenant_id, category_id);
create index if not exists purchase_order_items_tenant_variant_idx
  on public.purchase_order_items(tenant_id, variant_id);
create index if not exists purchase_orders_created_by_idx
  on public.purchase_orders(created_by);
create index if not exists purchase_orders_tenant_supplier_idx
  on public.purchase_orders(tenant_id, supplier_id);
create index if not exists tenant_memberships_user_id_idx
  on public.tenant_memberships(user_id);
