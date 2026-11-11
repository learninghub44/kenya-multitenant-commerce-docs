create table if not exists public.tenant_payment_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null check (provider in ('daraja', 'payhero')),
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  enabled boolean not null default false,
  credential_ciphertext text not null,
  credential_iv text not null,
  credential_version integer not null default 1,
  display_name text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);

create index if not exists tenant_payment_connections_tenant_idx
  on public.tenant_payment_connections (tenant_id);

alter table public.tenant_payment_connections enable row level security;

drop policy if exists "Owners and managers can read tenant payment connections" on public.tenant_payment_connections;
create policy "Owners and managers can read tenant payment connections"
  on public.tenant_payment_connections for select to authenticated
  using (exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_payment_connections.tenant_id
      and m.user_id = auth.uid() and m.active = true
      and m.role in ('owner', 'manager')
  ));

drop policy if exists "Owners and managers can manage tenant payment connections" on public.tenant_payment_connections;
create policy "Owners and managers can manage tenant payment connections"
  on public.tenant_payment_connections for all to authenticated
  using (exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_payment_connections.tenant_id
      and m.user_id = auth.uid() and m.active = true
      and m.role in ('owner', 'manager')
  ))
  with check (exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = tenant_payment_connections.tenant_id
      and m.user_id = auth.uid() and m.active = true
      and m.role in ('owner', 'manager')
  ));

create or replace function public.set_payment_connection_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenant_payment_connections_updated_at on public.tenant_payment_connections;
create trigger tenant_payment_connections_updated_at
before update on public.tenant_payment_connections
for each row execute function public.set_payment_connection_updated_at();
