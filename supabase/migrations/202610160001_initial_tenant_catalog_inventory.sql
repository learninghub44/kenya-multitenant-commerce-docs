-- Initial tenant-safe schema. Apply through Supabase migrations, never ad hoc dashboard edits.
create extension if not exists pgcrypto;

create type public.tenant_status as enum ('active', 'suspended', 'closed');
create type public.membership_role as enum ('owner', 'manager', 'catalog_editor', 'stock_clerk', 'order_operator', 'finance_viewer');
create type public.record_status as enum ('draft', 'published', 'archived');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$'),
  status public.tenant_status not null default 'active',
  currency char(3) not null default 'KES',
  timezone text not null default 'Africa/Nairobi',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role public.membership_role not null default 'manager',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (tenant_id, id)
);

-- SECURITY DEFINER avoids recursive membership RLS. The function only returns a boolean
-- for the authenticated user and pins its search_path to trusted schemas.
create or replace function public.is_active_tenant_member(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.tenant_memberships m
    join public.tenants t on t.id = m.tenant_id
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.active
      and t.status = 'active'
  );
$$;

create or replace function public.has_tenant_role(target_tenant uuid, allowed_roles public.membership_role[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.tenant_memberships m
    join public.tenants t on t.id = m.tenant_id
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.active
      and t.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.is_active_tenant_member(uuid) from public;
revoke all on function public.has_tenant_role(uuid, public.membership_role[]) from public;
grant execute on function public.is_active_tenant_member(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, public.membership_role[]) to authenticated;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status public.record_status not null default 'published',
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  category_id uuid,
  title text not null check (length(trim(title)) between 1 and 180),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  status public.record_status not null default 'draft',
  track_inventory boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, slug),
  constraint products_category_same_tenant
    foreign key (tenant_id, category_id) references public.categories(tenant_id, id)
    on delete restrict
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  product_id uuid not null,
  sku text,
  title text not null default 'Default',
  options jsonb not null default '{}'::jsonb,
  price_minor bigint not null check (price_minor >= 0),
  currency char(3) not null default 'KES',
  status public.record_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  constraint variants_product_same_tenant
    foreign key (tenant_id, product_id) references public.products(tenant_id, id)
    on delete restrict
);
create unique index product_variants_tenant_sku_unique
  on public.product_variants(tenant_id, upper(sku)) where sku is not null;

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 100),
  code text not null check (length(trim(code)) between 1 and 32),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code)
);

create table public.inventory_balances (
  tenant_id uuid not null,
  variant_id uuid not null,
  location_id uuid not null,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= on_hand),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, variant_id, location_id),
  foreign key (tenant_id, variant_id) references public.product_variants(tenant_id, id) on delete restrict,
  foreign key (tenant_id, location_id) references public.inventory_locations(tenant_id, id) on delete restrict
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  variant_id uuid not null,
  location_id uuid not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  movement_type text not null check (movement_type in ('opening', 'receipt', 'adjustment', 'reservation', 'reservation_release', 'sale', 'return', 'transfer_in', 'transfer_out', 'reversal')),
  reason text not null check (length(trim(reason)) between 1 and 500),
  source_reference text,
  idempotency_key text not null,
  actor_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key),
  foreign key (tenant_id, variant_id) references public.product_variants(tenant_id, id) on delete restrict,
  foreign key (tenant_id, location_id) references public.inventory_locations(tenant_id, id) on delete restrict
);

-- Direct client writes to balances and movement history are intentionally not granted.
-- All stock mutations must be implemented as transactional server-side RPC/domain operations.
create index products_tenant_status_idx on public.products(tenant_id, status);
create index variants_tenant_product_idx on public.product_variants(tenant_id, product_id);
create index movements_tenant_variant_created_idx on public.inventory_movements(tenant_id, variant_id, created_at desc);

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.inventory_balances enable row level security;
alter table public.inventory_movements enable row level security;

create policy "members can read own active tenants"
on public.tenants for select to authenticated
using (public.is_active_tenant_member(id));

create policy "members can read tenant memberships"
on public.tenant_memberships for select to authenticated
using (public.is_active_tenant_member(tenant_id));

create policy "catalog staff can read categories"
on public.categories for select to authenticated
using (public.is_active_tenant_member(tenant_id));

create policy "catalog staff can manage categories"
on public.categories for all to authenticated
using (public.has_tenant_role(tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]));

create policy "members can read products"
on public.products for select to authenticated
using (public.is_active_tenant_member(tenant_id));

create policy "catalog staff can manage products"
on public.products for all to authenticated
using (public.has_tenant_role(tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]));

create policy "members can read variants"
on public.product_variants for select to authenticated
using (public.is_active_tenant_member(tenant_id));

create policy "catalog staff can manage variants"
on public.product_variants for all to authenticated
using (public.has_tenant_role(tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]));

create policy "inventory staff can read locations"
on public.inventory_locations for select to authenticated
using (public.is_active_tenant_member(tenant_id));

create policy "owners and managers manage locations"
on public.inventory_locations for all to authenticated
using (public.has_tenant_role(tenant_id, array['owner','manager']::public.membership_role[]))
with check (public.has_tenant_role(tenant_id, array['owner','manager']::public.membership_role[]));

create policy "inventory staff can read balances"
on public.inventory_balances for select to authenticated
using (public.is_active_tenant_member(tenant_id));

create policy "inventory staff can read movement ledger"
on public.inventory_movements for select to authenticated
using (public.is_active_tenant_member(tenant_id));

-- Anonymous storefront access is intentionally not granted in this first migration.
-- Add a narrow published-catalogue view/policy alongside hostname resolution before launch.
