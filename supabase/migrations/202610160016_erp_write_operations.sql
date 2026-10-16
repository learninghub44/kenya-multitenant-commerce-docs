-- Tenant-authorized ERP write operations for customers, suppliers, expenses and purchasing.
create table public.goods_receipt_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  goods_receipt_id uuid not null,
  purchase_order_item_id uuid not null,
  quantity_received integer not null check (quantity_received > 0),
  created_at timestamptz not null default now(),
  unique (tenant_id,id),
  foreign key (tenant_id,goods_receipt_id) references public.goods_receipts(tenant_id,id) on delete restrict,
  foreign key (tenant_id,purchase_order_item_id) references public.purchase_order_items(tenant_id,id) on delete restrict
);
create index goods_receipt_items_parent_idx on public.goods_receipt_items(tenant_id,goods_receipt_id);
alter table public.goods_receipt_items enable row level security;
create policy "members can read goods receipt items" on public.goods_receipt_items
  for select to authenticated using (public.is_active_tenant_member(tenant_id));
revoke insert,update,delete on public.goods_receipt_items from anon,authenticated;

create or replace function public.create_tenant_customer(
  p_tenant_id uuid,p_display_name text,p_email text,p_phone text,p_notes text default ''
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare new_id uuid; clean_name text:=trim(coalesce(p_display_name,'')); clean_email text:=nullif(lower(trim(coalesce(p_email,''))),''); clean_phone text:=nullif(trim(coalesce(p_phone,'')),'');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id,array['owner','manager','order_operator']::public.membership_role[]) then raise exception 'You cannot manage customers' using errcode='42501'; end if;
  if length(clean_name)<1 or length(clean_name)>180 or length(coalesce(p_notes,''))>5000 then raise exception 'Invalid customer details' using errcode='22023'; end if;
  if clean_email is not null and (length(clean_email)>320 or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then raise exception 'Enter a valid email address' using errcode='22023'; end if;
  if clean_phone is not null and length(clean_phone)>40 then raise exception 'Phone number is too long' using errcode='22023'; end if;
  insert into public.customers(tenant_id,display_name,email,phone,notes) values(p_tenant_id,clean_name,clean_email,clean_phone,trim(coalesce(p_notes,''))) returning id into new_id;
  return new_id;
end; $$;

create or replace function public.create_tenant_supplier(
  p_tenant_id uuid,p_name text,p_email text,p_phone text,p_notes text default ''
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare new_id uuid; clean_name text:=trim(coalesce(p_name,'')); clean_email text:=nullif(lower(trim(coalesce(p_email,''))),''); clean_phone text:=nullif(trim(coalesce(p_phone,'')),'');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id,array['owner','manager','stock_clerk']::public.membership_role[]) then raise exception 'You cannot manage suppliers' using errcode='42501'; end if;
  if length(clean_name)<1 or length(clean_name)>180 or length(coalesce(p_notes,''))>5000 then raise exception 'Invalid supplier details' using errcode='22023'; end if;
  if clean_email is not null and (length(clean_email)>320 or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then raise exception 'Enter a valid email address' using errcode='22023'; end if;
  if clean_phone is not null and length(clean_phone)>40 then raise exception 'Phone number is too long' using errcode='22023'; end if;
  insert into public.suppliers(tenant_id,name,email,phone,notes) values(p_tenant_id,clean_name,clean_email,clean_phone,trim(coalesce(p_notes,''))) returning id into new_id;
  return new_id;
end; $$;

create or replace function public.create_tenant_expense(
  p_tenant_id uuid,p_description text,p_category text,p_amount_minor bigint,p_expense_date date,p_reference text,p_notes text default ''
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id,array['owner','manager','finance_viewer']::public.membership_role[]) then raise exception 'You cannot record expenses' using errcode='42501'; end if;
  if length(trim(coalesce(p_description,'')))<1 or length(p_description)>240 or length(trim(coalesce(p_category,'')))<1 or length(p_category)>80 then raise exception 'Invalid expense description or category' using errcode='22023'; end if;
  if p_amount_minor is null or p_amount_minor<=0 or p_amount_minor>1000000000000000 then raise exception 'Expense amount must be positive' using errcode='22023'; end if;
  if length(coalesce(p_reference,''))>120 or length(coalesce(p_notes,''))>5000 then raise exception 'Expense reference or notes are too long' using errcode='22023'; end if;
  insert into public.expenses(tenant_id,description,category,amount_minor,expense_date,reference,notes,created_by)
  values(p_tenant_id,trim(p_description),trim(p_category),p_amount_minor,coalesce(p_expense_date,current_date),nullif(trim(coalesce(p_reference,'')),''),trim(coalesce(p_notes,'')),auth.uid())
  returning id into new_id;
  insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_tenant_id,auth.uid(),'expense.recorded','expense',new_id::text,jsonb_build_object('amount_minor',p_amount_minor,'category',trim(p_category)));
  return new_id;
end; $$;

create or replace function public.create_purchase_order(
  p_tenant_id uuid,p_supplier_id uuid,p_reference text,p_notes text,p_items jsonb
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare new_id uuid; item record; clean_reference text:=trim(coalesce(p_reference,''));
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id,array['owner','manager','stock_clerk']::public.membership_role[]) then raise exception 'You cannot create purchase orders' using errcode='42501'; end if;
  if length(clean_reference)<1 or length(clean_reference)>80 or length(coalesce(p_notes,''))>5000 then raise exception 'Invalid purchase order reference or notes' using errcode='22023'; end if;
  if not exists(select 1 from public.suppliers where id=p_supplier_id and tenant_id=p_tenant_id and active) then raise exception 'Supplier not found or inactive' using errcode='P0002'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'Add between 1 and 100 purchase lines' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_items) e where jsonb_typeof(e)<>'object'
    or coalesce(e->>'variant_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(e->>'quantity','') !~ '^[0-9]{1,7}$' or (e->>'quantity')::integer<1 or (e->>'quantity')::integer>1000000
    or coalesce(e->>'unit_cost_minor','') !~ '^[0-9]{1,13}$') then raise exception 'Purchase lines contain invalid quantities, variants or costs' using errcode='22023'; end if;
  insert into public.purchase_orders(tenant_id,supplier_id,reference,status,notes,created_by)
  values(p_tenant_id,p_supplier_id,clean_reference,'draft',trim(coalesce(p_notes,'')),auth.uid()) returning id into new_id;
  for item in select (e->>'variant_id')::uuid variant_id,(e->>'quantity')::integer quantity,(e->>'unit_cost_minor')::bigint unit_cost_minor from jsonb_array_elements(p_items) e
  loop
    if not exists(select 1 from public.product_variants where id=item.variant_id and tenant_id=p_tenant_id and status<>'archived') then raise exception 'A purchase variant does not belong to this business' using errcode='22023'; end if;
    insert into public.purchase_order_items(tenant_id,purchase_order_id,variant_id,quantity_ordered,unit_cost_minor)
    values(p_tenant_id,new_id,item.variant_id,item.quantity,item.unit_cost_minor);
  end loop;
  insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_tenant_id,auth.uid(),'purchase_order.created','purchase_order',new_id::text,jsonb_build_object('reference',clean_reference));
  return new_id;
exception when unique_violation then raise exception 'That purchase order reference is already used' using errcode='23505';
end; $$;

create or replace function public.transition_purchase_order(
  p_tenant_id uuid,p_purchase_order_id uuid,p_status text
)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare current_status public.purchase_order_status;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id,array['owner','manager','stock_clerk']::public.membership_role[]) then raise exception 'You cannot manage purchase orders' using errcode='42501'; end if;
  select status into current_status from public.purchase_orders where id=p_purchase_order_id and tenant_id=p_tenant_id for update;
  if not found then raise exception 'Purchase order not found' using errcode='P0002'; end if;
  if p_status='submitted' and current_status='draft' then
    if not exists(select 1 from public.purchase_order_items where tenant_id=p_tenant_id and purchase_order_id=p_purchase_order_id) then raise exception 'Add at least one line before submitting' using errcode='22023'; end if;
    update public.purchase_orders set status='submitted',updated_at=now() where id=p_purchase_order_id and tenant_id=p_tenant_id;
  elsif p_status='cancelled' and current_status in ('draft','submitted') then
    update public.purchase_orders set status='cancelled',updated_at=now() where id=p_purchase_order_id and tenant_id=p_tenant_id;
  else raise exception 'Unsupported purchase order transition' using errcode='22023';
  end if;
  insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_tenant_id,auth.uid(),'purchase_order.status_changed','purchase_order',p_purchase_order_id::text,jsonb_build_object('from',current_status,'to',p_status));
end; $$;

create or replace function public.receive_purchase_order_line(
  p_tenant_id uuid,p_purchase_order_id uuid,p_purchase_order_item_id uuid,
  p_location_id uuid,p_quantity integer,p_receipt_reference text,p_idempotency_key text,p_notes text default ''
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  po public.purchase_orders%rowtype;
  po_item public.purchase_order_items%rowtype;
  receipt_id uuid;
  clean_key text:=trim(coalesce(p_idempotency_key,''));
  clean_ref text:=trim(coalesce(p_receipt_reference,''));
  new_received integer;
  remaining_count integer;
  total_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id,array['owner','manager','stock_clerk']::public.membership_role[]) then raise exception 'You cannot receive stock' using errcode='42501'; end if;
  if p_quantity is null or p_quantity<1 or p_quantity>1000000 then raise exception 'Receive a positive quantity' using errcode='22023'; end if;
  if length(clean_ref)<1 or length(clean_ref)>80 or length(clean_key)<8 or length(clean_key)>80 or length(coalesce(p_notes,''))>5000 then raise exception 'Invalid receipt details' using errcode='22023'; end if;
  select * into po from public.purchase_orders where id=p_purchase_order_id and tenant_id=p_tenant_id for update;
  if not found or po.status not in ('submitted','partially_received') then raise exception 'Purchase order must be submitted before receiving stock' using errcode='22023'; end if;
  if not exists(select 1 from public.inventory_locations where id=p_location_id and tenant_id=p_tenant_id and active) then raise exception 'Inventory location not found or inactive' using errcode='22023'; end if;
  select * into po_item from public.purchase_order_items where id=p_purchase_order_item_id and tenant_id=p_tenant_id and purchase_order_id=p_purchase_order_id for update;
  if not found then raise exception 'Purchase line not found' using errcode='P0002'; end if;
  if po_item.quantity_received+p_quantity>po_item.quantity_ordered then raise exception 'Received quantity exceeds outstanding purchase quantity' using errcode='23514'; end if;

  insert into public.goods_receipts(tenant_id,purchase_order_id,location_id,receipt_reference,received_by,idempotency_key,notes)
  values(p_tenant_id,p_purchase_order_id,p_location_id,clean_ref,auth.uid(),clean_key,trim(coalesce(p_notes,'')))
  returning id into receipt_id;
  insert into public.goods_receipt_items(tenant_id,goods_receipt_id,purchase_order_item_id,quantity_received)
  values(p_tenant_id,receipt_id,p_purchase_order_item_id,p_quantity);
  update public.purchase_order_items set quantity_received=quantity_received+p_quantity
  where id=p_purchase_order_item_id and tenant_id=p_tenant_id returning quantity_received into new_received;

  perform public.record_inventory_movement(p_tenant_id,po_item.variant_id,p_location_id,p_quantity,'receipt',
    'Goods received: ' || clean_ref,receipt_id::text,clean_key || ':' || po_item.variant_id::text);
  select count(*) filter(where quantity_received<quantity_ordered),count(*) into remaining_count,total_count
  from public.purchase_order_items where tenant_id=p_tenant_id and purchase_order_id=p_purchase_order_id;
  update public.purchase_orders set status=case when remaining_count=0 then 'received'::public.purchase_order_status else 'partially_received'::public.purchase_order_status end,updated_at=now()
  where id=p_purchase_order_id and tenant_id=p_tenant_id;
  insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_tenant_id,auth.uid(),'goods_receipt.posted','goods_receipt',receipt_id::text,jsonb_build_object('purchase_order_id',p_purchase_order_id,'variant_id',po_item.variant_id,'quantity',p_quantity));
  return receipt_id;
exception when unique_violation then raise exception 'Receipt reference or idempotency key already exists' using errcode='23505';
end; $$;

revoke all on function public.create_tenant_customer(uuid,text,text,text,text) from public,anon;
revoke all on function public.create_tenant_supplier(uuid,text,text,text,text) from public,anon;
revoke all on function public.create_tenant_expense(uuid,text,text,bigint,date,text,text) from public,anon;
revoke all on function public.create_purchase_order(uuid,uuid,text,text,jsonb) from public,anon;
revoke all on function public.transition_purchase_order(uuid,uuid,text) from public,anon;
revoke all on function public.receive_purchase_order_line(uuid,uuid,uuid,uuid,integer,text,text,text) from public,anon;
grant execute on function public.create_tenant_customer(uuid,text,text,text,text) to authenticated;
grant execute on function public.create_tenant_supplier(uuid,text,text,text,text) to authenticated;
grant execute on function public.create_tenant_expense(uuid,text,text,bigint,date,text,text) to authenticated;
grant execute on function public.create_purchase_order(uuid,uuid,text,text,jsonb) to authenticated;
grant execute on function public.transition_purchase_order(uuid,uuid,text) to authenticated;
grant execute on function public.receive_purchase_order_line(uuid,uuid,uuid,uuid,integer,text,text,text) to authenticated;
