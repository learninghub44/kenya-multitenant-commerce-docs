-- Public store profile (owner/business details shown on the storefront) and
-- reserved subdomain protection. Writes go through a role-checked RPC only.

alter table public.tenants
  add constraint tenants_slug_not_reserved check (slug <> all (array[
    'www','app','admin','api','mail','support','auth','dashboard','onboarding','store','stores',
    'login','register','signin','signup','static','assets','cdn','docs','help','status','blog',
    'billing','root','ftp','smtp','imap','pop','ns1','ns2','dev','staging','test'
  ])) not valid;

create or replace function public.create_tenant_for_current_user(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  new_tenant_id uuid;
  clean_name text := trim(coalesce(p_name, ''));
  clean_slug text := lower(trim(coalesce(p_slug, '')));
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if length(clean_name) < 2 or length(clean_name) > 120 then
    raise exception 'Business name must be between 2 and 120 characters' using errcode = '22023';
  end if;
  if clean_slug !~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$' then
    raise exception 'Store slug must be 3-50 lowercase letters, numbers or hyphens' using errcode = '22023';
  end if;
  if clean_slug = any (array[
    'www','app','admin','api','mail','support','auth','dashboard','onboarding','store','stores',
    'login','register','signin','signup','static','assets','cdn','docs','help','status','blog',
    'billing','root','ftp','smtp','imap','pop','ns1','ns2','dev','staging','test'
  ]) then
    raise exception 'That store address is reserved. Choose another one.' using errcode = '23505';
  end if;

  insert into public.tenants (name, slug, status, currency, timezone)
  values (clean_name, clean_slug, 'active', 'KES', 'Africa/Nairobi')
  returning id into new_tenant_id;

  insert into public.tenant_memberships (tenant_id, user_id, role, active)
  values (new_tenant_id, current_user_id, 'owner', true);

  return new_tenant_id;
exception
  when unique_violation then
    raise exception 'That store address is already taken. Choose another one.' using errcode = '23505';
end;
$$;

revoke all on function public.create_tenant_for_current_user(text, text) from public, anon;
grant execute on function public.create_tenant_for_current_user(text, text) to authenticated;

create table public.store_profiles (
  tenant_id uuid primary key references public.tenants(id) on delete restrict,
  tagline text check (tagline is null or length(tagline) <= 120),
  about text check (about is null or length(about) <= 2000),
  logo_url text check (logo_url is null or logo_url ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/'),
  banner_url text check (banner_url is null or banner_url ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/'),
  owner_name text check (owner_name is null or length(owner_name) <= 120),
  owner_title text check (owner_title is null or length(owner_title) <= 80),
  owner_bio text check (owner_bio is null or length(owner_bio) <= 1000),
  owner_photo_url text check (owner_photo_url is null or owner_photo_url ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/'),
  phone text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+?[0-9 ()-]{7,20}$'),
  email text check (email is null or (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  address_line text check (address_line is null or length(address_line) <= 200),
  town text check (town is null or length(town) <= 100),
  county text check (county is null or length(county) <= 100),
  opening_hours text check (opening_hours is null or length(opening_hours) <= 500),
  website_url text check (website_url is null or (length(website_url) <= 300 and website_url ~ '^https://[^\s]+$')),
  facebook_url text check (facebook_url is null or (length(facebook_url) <= 300 and facebook_url ~ '^https://[^\s]+$')),
  instagram_url text check (instagram_url is null or (length(instagram_url) <= 300 and instagram_url ~ '^https://[^\s]+$')),
  tiktok_url text check (tiktok_url is null or (length(tiktok_url) <= 300 and tiktok_url ~ '^https://[^\s]+$')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_profiles enable row level security;

-- Members can read their own store profile in the dashboard. There are no client
-- write policies: changes go through save_store_profile only.
create policy store_profiles_member_read on public.store_profiles
  for select to authenticated
  using (public.is_active_tenant_member(tenant_id));

create or replace function public.clean_store_text(p_value text, p_max integer, p_label text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare v text := nullif(trim(coalesce(p_value, '')), '');
begin
  if v is not null and length(v) > p_max then
    raise exception '% must be % characters or fewer', p_label, p_max using errcode = '22023';
  end if;
  return v;
end;
$$;

create or replace function public.clean_store_url(p_value text, p_label text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare v text := nullif(trim(coalesce(p_value, '')), '');
begin
  if v is null then return null; end if;
  if length(v) > 300 or v !~ '^https://[^[:space:]]+$' then
    raise exception '% must be a full link starting with https://', p_label using errcode = '22023';
  end if;
  return v;
end;
$$;

create or replace function public.clean_store_image(p_value text, p_label text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare v text := nullif(trim(coalesce(p_value, '')), '');
begin
  if v is null then return null; end if;
  if v !~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/' or length(v) > 500 then
    raise exception '% must be an image uploaded through the dashboard', p_label using errcode = '22023';
  end if;
  return v;
end;
$$;

create or replace function public.clean_store_phone(p_value text, p_label text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare v text := nullif(trim(coalesce(p_value, '')), '');
begin
  if v is null then return null; end if;
  if v !~ '^\+?[0-9 ()-]{7,20}$' then
    raise exception '% must be a valid phone number', p_label using errcode = '22023';
  end if;
  return v;
end;
$$;

create or replace function public.clean_store_email(p_value text)
returns text
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare v text := nullif(lower(trim(coalesce(p_value, ''))), '');
begin
  if v is null then return null; end if;
  if length(v) > 254 or v !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Store email must be a valid email address' using errcode = '22023';
  end if;
  return v;
end;
$$;

revoke all on function public.clean_store_text(text, integer, text) from public, anon, authenticated;
revoke all on function public.clean_store_url(text, text) from public, anon, authenticated;
revoke all on function public.clean_store_image(text, text) from public, anon, authenticated;
revoke all on function public.clean_store_phone(text, text) from public, anon, authenticated;
revoke all on function public.clean_store_email(text) from public, anon, authenticated;

create or replace function public.save_store_profile(p_tenant_id uuid, p_profile jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not public.has_tenant_role(p_tenant_id, array['owner','manager']::public.membership_role[]) then
    raise exception 'Only owners and managers can edit the store profile' using errcode = '42501';
  end if;
  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then
    raise exception 'Invalid store profile' using errcode = '22023';
  end if;

  insert into public.store_profiles (
    tenant_id, tagline, about, logo_url, banner_url, owner_name, owner_title, owner_bio, owner_photo_url,
    phone, whatsapp, email, address_line, town, county, opening_hours,
    website_url, facebook_url, instagram_url, tiktok_url
  ) values (
    p_tenant_id,
    public.clean_store_text(p_profile->>'tagline', 120, 'Tagline'),
    public.clean_store_text(p_profile->>'about', 2000, 'About'),
    public.clean_store_image(p_profile->>'logo_url', 'Logo'),
    public.clean_store_image(p_profile->>'banner_url', 'Banner'),
    public.clean_store_text(p_profile->>'owner_name', 120, 'Owner name'),
    public.clean_store_text(p_profile->>'owner_title', 80, 'Owner title'),
    public.clean_store_text(p_profile->>'owner_bio', 1000, 'Owner bio'),
    public.clean_store_image(p_profile->>'owner_photo_url', 'Owner photo'),
    public.clean_store_phone(p_profile->>'phone', 'Phone'),
    public.clean_store_phone(p_profile->>'whatsapp', 'WhatsApp number'),
    public.clean_store_email(p_profile->>'email'),
    public.clean_store_text(p_profile->>'address_line', 200, 'Address'),
    public.clean_store_text(p_profile->>'town', 100, 'Town'),
    public.clean_store_text(p_profile->>'county', 100, 'County'),
    public.clean_store_text(p_profile->>'opening_hours', 500, 'Opening hours'),
    public.clean_store_url(p_profile->>'website_url', 'Website'),
    public.clean_store_url(p_profile->>'facebook_url', 'Facebook link'),
    public.clean_store_url(p_profile->>'instagram_url', 'Instagram link'),
    public.clean_store_url(p_profile->>'tiktok_url', 'TikTok link')
  )
  on conflict (tenant_id) do update set
    tagline = excluded.tagline, about = excluded.about, logo_url = excluded.logo_url,
    banner_url = excluded.banner_url, owner_name = excluded.owner_name, owner_title = excluded.owner_title,
    owner_bio = excluded.owner_bio, owner_photo_url = excluded.owner_photo_url, phone = excluded.phone,
    whatsapp = excluded.whatsapp, email = excluded.email, address_line = excluded.address_line,
    town = excluded.town, county = excluded.county, opening_hours = excluded.opening_hours,
    website_url = excluded.website_url, facebook_url = excluded.facebook_url,
    instagram_url = excluded.instagram_url, tiktok_url = excluded.tiktok_url,
    updated_at = now();

  insert into public.audit_events(tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_tenant_id, auth.uid(), 'store_profile.saved', 'store_profile', p_tenant_id::text, '{}'::jsonb);
end;
$$;

revoke all on function public.save_store_profile(uuid, jsonb) from public, anon;
grant execute on function public.save_store_profile(uuid, jsonb) to authenticated;

-- Public read model. Only fields the owner chose to publish on the storefront.
-- Never exposes the owner's sign-in email, memberships, orders or customers.
create or replace function public.get_public_store_profile(p_store_slug text)
returns table (
  store_name text, store_slug text, currency char(3),
  tagline text, about text, logo_url text, banner_url text,
  owner_name text, owner_title text, owner_bio text, owner_photo_url text,
  phone text, whatsapp text, email text,
  address_line text, town text, county text, opening_hours text,
  website_url text, facebook_url text, instagram_url text, tiktok_url text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select t.name, t.slug, t.currency,
    sp.tagline, sp.about, sp.logo_url, sp.banner_url,
    sp.owner_name, sp.owner_title, sp.owner_bio, sp.owner_photo_url,
    sp.phone, sp.whatsapp, sp.email,
    sp.address_line, sp.town, sp.county, sp.opening_hours,
    sp.website_url, sp.facebook_url, sp.instagram_url, sp.tiktok_url
  from public.tenants t
  left join public.store_profiles sp on sp.tenant_id = t.id
  where t.slug = lower(trim(coalesce(p_store_slug, ''))) and t.status = 'active';
$$;

revoke all on function public.get_public_store_profile(text) from public;
grant execute on function public.get_public_store_profile(text) to anon, authenticated;
comment on function public.get_public_store_profile(text) is
  'Public store profile read model: business name plus owner-published profile fields only.';
