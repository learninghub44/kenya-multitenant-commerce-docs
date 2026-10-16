-- Viewer roles are read-only: only owners/managers can attest to manual payment
-- receipt or create expense entries.
create or replace function public.create_tenant_expense(
  p_tenant_id uuid,p_description text,p_category text,p_amount_minor bigint,p_expense_date date,p_reference text,p_notes text default ''
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id,array['owner','manager']::public.membership_role[]) then
    raise exception 'Only owners and managers can record expenses' using errcode='42501';
  end if;
  if length(trim(coalesce(p_description,'')))<1 or length(p_description)>240 or length(trim(coalesce(p_category,'')))<1 or length(p_category)>80 then
    raise exception 'Invalid expense description or category' using errcode='22023';
  end if;
  if p_amount_minor is null or p_amount_minor<=0 or p_amount_minor>1000000000000000 then raise exception 'Expense amount must be positive' using errcode='22023'; end if;
  if length(coalesce(p_reference,''))>120 or length(coalesce(p_notes,''))>5000 then raise exception 'Expense reference or notes are too long' using errcode='22023'; end if;
  insert into public.expenses(tenant_id,description,category,amount_minor,expense_date,reference,notes,created_by)
  values(p_tenant_id,trim(p_description),trim(p_category),p_amount_minor,coalesce(p_expense_date,current_date),nullif(trim(coalesce(p_reference,'')),''),trim(coalesce(p_notes,'')),auth.uid())
  returning id into new_id;
  insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_tenant_id,auth.uid(),'expense.recorded','expense',new_id::text,jsonb_build_object('amount_minor',p_amount_minor,'category',trim(p_category)));
  return new_id;
end; $$;
revoke all on function public.create_tenant_expense(uuid,text,text,bigint,date,text,text) from public,anon;
grant execute on function public.create_tenant_expense(uuid,text,text,bigint,date,text,text) to authenticated;

create or replace function public.record_manual_order_payment(
  p_tenant_id uuid, p_order_id uuid, p_reference text, p_notes text default ''
)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  target_order public.orders%rowtype;
  clean_reference text:=trim(coalesce(p_reference,''));
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id,array['owner','manager']::public.membership_role[]) then
    raise exception 'Only owners and managers can attest to payment receipt' using errcode='42501';
  end if;
  if length(clean_reference)<3 or length(clean_reference)>120 then raise exception 'Enter the actual payment reference' using errcode='22023'; end if;
  if length(coalesce(p_notes,''))>1000 then raise exception 'Payment notes are too long' using errcode='22023'; end if;
  select * into target_order from public.orders o where o.id=p_order_id and o.tenant_id=p_tenant_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  if target_order.status not in ('pending','confirmed') or target_order.payment_status not in ('pending','failed') then
    raise exception 'This order cannot accept a manual payment record' using errcode='22023';
  end if;
  insert into public.payment_transactions(tenant_id,order_id,provider,merchant_reference,status,amount_minor,currency,response_summary,last_error)
  values(p_tenant_id,p_order_id,'manual','manual:' || p_order_id::text,'succeeded',target_order.total_minor,target_order.currency,
    jsonb_build_object('reference',clean_reference,'notes',trim(coalesce(p_notes,'')),'recorded_by',auth.uid()),null);
  update public.orders set payment_status='succeeded',status='confirmed',updated_at=now()
  where id=p_order_id and tenant_id=p_tenant_id;
  insert into public.audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_tenant_id,auth.uid(),'payment.manual_recorded','order',p_order_id::text,
    jsonb_build_object('reference',clean_reference,'amount_minor',target_order.total_minor));
end; $$;
revoke all on function public.record_manual_order_payment(uuid,uuid,text,text) from public,anon;
grant execute on function public.record_manual_order_payment(uuid,uuid,text,text) to authenticated;
