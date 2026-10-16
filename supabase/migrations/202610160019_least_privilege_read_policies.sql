-- Least-privilege read policies: financial, customer and supplier records are not
-- visible to every staff role just because they belong to the same tenant.
drop policy if exists "members can read customers" on public.customers;
create policy "customer-facing roles can read customers" on public.customers
  for select to authenticated using (
    public.has_tenant_role(tenant_id,array['owner','manager','order_operator']::public.membership_role[])
  );

drop policy if exists "members can read suppliers" on public.suppliers;
create policy "purchasing roles can read suppliers" on public.suppliers
  for select to authenticated using (
    public.has_tenant_role(tenant_id,array['owner','manager','stock_clerk']::public.membership_role[])
  );

drop policy if exists "members can read orders" on public.orders;
create policy "order and finance roles can read orders" on public.orders
  for select to authenticated using (
    public.has_tenant_role(tenant_id,array['owner','manager','order_operator','finance_viewer']::public.membership_role[])
  );

drop policy if exists "members can read order items" on public.order_items;
create policy "order and finance roles can read order items" on public.order_items
  for select to authenticated using (
    public.has_tenant_role(tenant_id,array['owner','manager','order_operator','finance_viewer']::public.membership_role[])
  );

drop policy if exists "members can read purchase orders" on public.purchase_orders;
create policy "purchasing roles can read purchase orders" on public.purchase_orders
  for select to authenticated using (
    public.has_tenant_role(tenant_id,array['owner','manager','stock_clerk']::public.membership_role[])
  );

drop policy if exists "members can read purchase order items" on public.purchase_order_items;
create policy "purchasing roles can read purchase order items" on public.purchase_order_items
  for select to authenticated using (
    public.has_tenant_role(tenant_id,array['owner','manager','stock_clerk']::public.membership_role[])
  );

drop policy if exists "members can read goods receipts" on public.goods_receipts;
create policy "purchasing roles can read goods receipts" on public.goods_receipts
  for select to authenticated using (
    public.has_tenant_role(tenant_id,array['owner','manager','stock_clerk']::public.membership_role[])
  );

drop policy if exists "members can read goods receipt items" on public.goods_receipt_items;
create policy "purchasing roles can read goods receipt items" on public.goods_receipt_items
  for select to authenticated using (
    public.has_tenant_role(tenant_id,array['owner','manager','stock_clerk']::public.membership_role[])
  );
