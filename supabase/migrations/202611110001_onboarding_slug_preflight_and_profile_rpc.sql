-- Authenticated users may check a candidate store slug before creating a workspace.
-- The final unique constraint remains authoritative; this RPC is only a UX preflight.
create or replace function public.is_store_slug_available(p_slug text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  clean_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if clean_slug !~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$' then
    return false;
  end if;
  if clean_slug = any (array[
    'www','app','admin','api','mail','support','auth','dashboard','onboarding','store','stores',
    'login','register','signin','signup','static','assets','cdn','docs','help','status','blog',
    'billing','root','ftp','smtp','imap','pop','ns1','ns2','dev','staging','test'
  ]) then
    return false;
  end if;
  return not exists (select 1 from public.tenants t where t.slug = clean_slug);
end;
$$;

revoke all on function public.is_store_slug_available(text) from public, anon;
grant execute on function public.is_store_slug_available(text) to authenticated;

-- Keep workspace and optional public contact-profile creation atomic. Both nested
-- RPCs derive the acting user from auth.uid(); callers cannot nominate an owner.
create or replace function public.create_tenant_with_profile_for_current_user(
  p_name text,
  p_slug text,
  p_profile jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_profile is not null and jsonb_typeof(p_profile) <> 'object' then
    raise exception 'Invalid store profile' using errcode = '22023';
  end if;

  new_tenant_id := public.create_tenant_for_current_user(p_name, p_slug);
  if p_profile is not null and p_profile <> '{}'::jsonb then
    perform public.save_store_profile(new_tenant_id, p_profile);
  end if;
  return new_tenant_id;
end;
$$;

revoke all on function public.create_tenant_with_profile_for_current_user(text, text, jsonb) from public, anon;
grant execute on function public.create_tenant_with_profile_for_current_user(text, text, jsonb) to authenticated;
