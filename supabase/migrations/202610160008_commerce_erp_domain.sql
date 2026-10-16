-- Commerce/ERP domain foundation. All business writes will be exposed through
-- validated transactional RPCs or trusted server handlers, not direct table writes.
-- Apply after 202610160007_product_category_assignment.sql.

create type public.order_status as enum (
  'pending', 'confirmed', 'processing', 'ready_for_fulfilment',
  'fulfilled', 'cancelled', 'refunded'
);
create type public.payment_status as enum (
  'pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'
);
create type public.purchase_order_status as enum (
  'draft', 'submitted', 'partially_received', 'received', 'cancelled'
);
create type public.expense_status as enum ('draft', 'recorded', 'voided');

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  display_name text not null check (length(trim(display_name)) between 1 and 180),
  email text,
  phone text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (email is null or length(email) <= 320),
  check (phone is null or length(phone) <= 40),
  check (length(notes) <= 5000)
);
create index customers_tenant_name_idx on public.customers (tenant_id, lower(display_name));

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 180),
  email text,
  phone text,
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (email is null or length(email) <= 320),
  check (phone is null or length(phone) <= 40),
  check (length(notes) <= 5000)
);
create index suppliers_tenant_name_idx on public.suppliers (tenant_id, lower(name));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_number text not null,
  customer_id uuid,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  currency char(3) not null default 'KES',
  subtotal_minor bigint not null default 0 check (subtotal_minor >= 0),
  discount_minor bigint not null default 0 check (discount_minor >= 0),
  delivery_minor bigint not null default 0 check (delivery_minor >= 0),
  total_minor bigint not null default 0 check (total_minor >= 0),
  customer_name_snapshot text not null default '',
  customer_phone_snapshot text not null default '',
  delivery_address_snapshot text not null default '',
  notes text not null default '',
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, order_number),
  unique (tenant_id, idempotency_key),
  foreign key (tenant_id, customer_id) references public.customers(tenant_id, id) on delete restrict,
  check (discount_minor <= subtotal_minor),
  check (total_minor = subtotal_minor - discount_minor + delivery_minor),
  check (length(order_number) between 1 and 80),
  check (length(idempotency_key) between 8 and 160),
  check (length(customer_name_snapshot) <= 180),
  check (length(customer_phone_snapshot) <= 40),
  check (length(delivery_address_snapshot) <= 2000),
  check (length(notes) <= 5000)
);
create index orders_tenant_created_idx on public.orders (tenant_id, created_at desc);
create index orders_tenant_status_idx on public.orders (tenant_id, status, created_at desc);

-- Immutable item snapshots prevent later catalogue edits changing historical orders.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_id uuid not null,
  variant_id uuid,
  product_title_snapshot text not null,
  variant_title_snapshot text not null default '',
  sku_snapshot text,
  quantity integer not null check (quantity > 0 and quantity <= 1000000),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  line_total_minor bigint generated always as (quantity::bigint * unit_price_minor) stored,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, order_id) references public.orders(tenant_id, id) on delete restrict,
  foreign key (tenant_id, variant_id) references public.product_variants(tenant_id, id) on delete restrict,
  check (length(product_title_snapshot) between 1 and 180),
  check (length(variant_title_snapshot) <= 180),
  check (sku_snapshot is null or length(sku_snapshot) <= 80)
);
create index order_items_order_idx on public.order_items (tenant_id, order_id);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  supplier_id uuid not null,
  reference text not null,
  status public.purchase_order_status not null default 'draft',
  currency char(3) not null default 'KES',
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, reference),
  foreign key (tenant_id, supplier_id) references public.suppliers(tenant_id, id) on delete restrict,
  check (length(reference) between 1 and 80),
  check (length(notes) <= 5000)
);
create index purchase_orders_tenant_created_idx on public.purchase_orders (tenant_id, created_at desc);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  purchase_order_id uuid not null,
  variant_id uuid not null,
  quantity_ordered integer not null check (quantity_ordered > 0),
  quantity_received integer not null default 0 check (quantity_received >= 0),
  unit_cost_minor bigint not null check (unit_cost_minor >= 0),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, purchase_order_id) references public.purchase_orders(tenant_id, id) on delete restrict,
  foreign key (tenant_id, variant_id) references public.product_variants(tenant_id, id) on delete restrict,
  check (quantity_received <= quantity_ordered)
);
create index purchase_order_items_parent_idx on public.purchase_order_items (tenant_id, purchase_order_id);

create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  purchase_order_id uuid not null,
  location_id uuid not null,
  receipt_reference text not null,
  received_by uuid references auth.users(id) on delete set null,
  idempotency_key text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, receipt_reference),
  unique (tenant_id, idempotency_key),
  foreign key (tenant_id, purchase_order_id) references public.purchase_orders(tenant_id, id) on delete restrict,
  foreign key (tenant_id, location_id) references public.inventory_locations(tenant_id, id) on delete restrict,
  check (length(receipt_reference) between 1 and 80),
  check (length(idempotency_key) between 8 and 160),
  check (length(notes) <= 5000)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  description text not null check (length(trim(description)) between 1 and 240),
  category text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'KES',
  expense_date date not null default current_date,
  reference text,
  notes text not null default '',
  status public.expense_status not null default 'recorded',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (length(category) between 1 and 80),
  check (reference is null or length(reference) <= 120),
  check (length(notes) <= 5000)
);
create index expenses_tenant_date_idx on public.expenses (tenant_id, expense_date desc);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  order_id uuid not null,
  provider text not null check (provider in ('daraja', 'payhero', 'manual')),
  provider_reference text,
  merchant_reference text not null,
  status public.payment_status not null default 'pending',
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'KES',
  request_payload jsonb not null default '{}'::jsonb,
  response_summary jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, merchant_reference),
  foreign key (tenant_id, order_id) references public.orders(tenant_id, id) on delete restrict,
  check (provider_reference is null or length(provider_reference) <= 200),
  check (length(merchant_reference) between 8 and 160),
  check (last_error is null or length(last_error) <= 2000)
);
create unique index payment_provider_reference_unique
  on public.payment_transactions(provider, provider_reference)
  where provider_reference is not null;
create index payment_transactions_order_idx on public.payment_transactions (tenant_id, order_id, created_at desc);

-- Persist callback IDs before processing. The unique provider/event pair makes replays detectable.
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('daraja', 'payhero')),
  provider_event_id text not null,
  transaction_id uuid,
  payload_digest text not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processing', 'processed', 'ignored', 'failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_summary text,
  unique (provider, provider_event_id),
  foreign key (transaction_id) references public.payment_transactions(id) on delete restrict,
  check (length(provider_event_id) between 1 and 240),
  check (length(payload_digest) between 32 and 128),
  check (error_summary is null or length(error_summary) <= 2000)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (length(action) between 1 and 120),
  entity_type text not null check (length(entity_type) between 1 and 100),
  entity_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (tenant_id) references public.tenants(id) on delete restrict,
  check (entity_id is null or length(entity_id) <= 200),
  check (request_id is null or length(request_id) <= 200)
);
create index audit_events_tenant_created_idx on public.audit_events (tenant_id, created_at desc);

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  event_type text not null check (length(event_type) between 1 and 120),
  destination text not null check (length(destination) between 1 and 320),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (tenant_id, id),
  check (last_error is null or length(last_error) <= 2000)
);
create index notification_outbox_pending_idx
  on public.notification_outbox (available_at, created_at) where status in ('pending', 'failed');

-- Public browser clients must not be able to write orders, payment records, audit entries,
-- purchase records, expenses, or notification jobs directly.
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.goods_receipts enable row level security;
alter table public.expenses enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.notification_outbox enable row level security;

create policy "members can read customers" on public.customers for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "members can read suppliers" on public.suppliers for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "members can read orders" on public.orders for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "members can read order items" on public.order_items for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "members can read purchase orders" on public.purchase_orders for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "members can read purchase order items" on public.purchase_order_items for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "members can read goods receipts" on public.goods_receipts for select to authenticated using (public.is_active_tenant_member(tenant_id));
create policy "finance and owners can read expenses" on public.expenses for select to authenticated using (
  public.has_tenant_role(tenant_id, array['owner','manager','finance_viewer']::public.membership_role[])
);
create policy "finance and owners can read payments" on public.payment_transactions for select to authenticated using (
  public.has_tenant_role(tenant_id, array['owner','manager','finance_viewer','order_operator']::public.membership_role[])
);
create policy "finance and owners can read audit events" on public.audit_events for select to authenticated using (
  public.has_tenant_role(tenant_id, array['owner','manager']::public.membership_role[])
);

-- These tables are intentionally server-only. No authenticated or anonymous policies exist.
revoke all on public.payment_events from anon, authenticated;
revoke all on public.notification_outbox from anon, authenticated;
revoke insert, update, delete on public.audit_events from anon, authenticated;
revoke insert, update, delete on public.payment_transactions from anon, authenticated;
revoke insert, update, delete on public.orders, public.order_items from anon, authenticated;
revoke insert, update, delete on public.customers, public.suppliers from anon, authenticated;
revoke insert, update, delete on public.purchase_orders, public.purchase_order_items, public.goods_receipts from anon, authenticated;
revoke insert, update, delete on public.expenses from anon, authenticated;

-- Avoid accidental PUBLIC execution on newly introduced security-definer functions in future.
comment on table public.payment_events is 'Server-only webhook inbox. Verify provider authenticity before applying state transitions.';
comment on table public.audit_events is 'Append-only audit history; write via trusted server functions only.';
comment on table public.notification_outbox is 'Transactional notification queue; delivery retries must be idempotent.';
