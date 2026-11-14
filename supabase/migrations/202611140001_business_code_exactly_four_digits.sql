-- Enforce the requested permanent four-digit business reference (0000 is excluded).
-- Codes are identifiers only; authorization must continue to use tenant UUIDs and RLS.
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
  -- Serialize assignment so concurrent business creation cannot collide.
  perform pg_advisory_xact_lock(hashtextextended('tenants.business_code', 0));
  for attempt in 1..9000 loop
    candidate := (1000 + floor(random() * 9000))::integer::text;
    if not exists (select 1 from public.tenants t where t.business_code = candidate) then
      return candidate;
    end if;
  end loop;
  raise exception 'All four-digit business IDs are allocated' using errcode = '53000';
end;
$$;
revoke all on function public.generate_business_code() from public, anon, authenticated;

-- Reassign any legacy fallback IDs longer than four digits.
alter table public.tenants drop constraint if exists tenants_business_code_format;

do $$
declare
  r record;
begin
  for r in
    select id from public.tenants
    where business_code is null or business_code !~ '^[0-9]{4}$'
    order by created_at, id
  loop
    update public.tenants
      set business_code = public.generate_business_code()
      where id = r.id;
  end loop;
end;
$$;

alter table public.tenants
  add constraint tenants_business_code_format
  check (business_code ~ '^[0-9]{4}$');
