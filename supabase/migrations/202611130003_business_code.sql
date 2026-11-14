-- Every business gets a short public identifier (e.g. 7166) that staff can quote to support.
-- It is an identifier, not a secret: never use it for authorization.
alter table public.tenants add column if not exists business_code text;

create or replace function public.generate_business_code()
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  candidate text;
  attempt integer;
begin
  -- Serialize generation so two concurrent signups cannot pick the same code.
  perform pg_advisory_xact_lock(hashtextextended('tenants.business_code', 0));
  for attempt in 1..80 loop
    candidate := (1000 + floor(random() * 9000))::integer::text;
    if not exists (select 1 from public.tenants t where t.business_code = candidate) then return candidate; end if;
  end loop;
  -- Four-digit space is nearly full: fall back to five digits.
  for attempt in 1..80 loop
    candidate := (10000 + floor(random() * 90000))::integer::text;
    if not exists (select 1 from public.tenants t where t.business_code = candidate) then return candidate; end if;
  end loop;
  raise exception 'Could not allocate a business code' using errcode = '53000';
end;
$$;
revoke all on function public.generate_business_code() from public, anon, authenticated;

create or replace function public.tenants_assign_business_code()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.business_code is null then new.business_code := public.generate_business_code(); end if;
  return new;
end;
$$;
revoke all on function public.tenants_assign_business_code() from public, anon, authenticated;

drop trigger if exists tenants_assign_business_code_before_insert on public.tenants;
create trigger tenants_assign_business_code_before_insert
before insert on public.tenants
for each row execute function public.tenants_assign_business_code();

-- Backfill existing businesses one row at a time so each lookup sees the previous assignment.
do $$
declare r record;
begin
  for r in select id from public.tenants where business_code is null order by created_at loop
    update public.tenants set business_code = public.generate_business_code() where id = r.id;
  end loop;
end $$;

alter table public.tenants alter column business_code set not null;
alter table public.tenants add constraint tenants_business_code_format check (business_code ~ '^[0-9]{4,6}$');
alter table public.tenants add constraint tenants_business_code_key unique (business_code);
