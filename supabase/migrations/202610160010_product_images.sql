create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  product_id uuid not null,
  public_id text not null,
  secure_url text not null,
  alt_text text not null default '',
  position integer not null default 0 check (position >= 0 and position <= 1000),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, public_id),
  foreign key (tenant_id, product_id) references public.products(tenant_id, id) on delete restrict,
  check (length(public_id) between 1 and 255),
  check (length(alt_text) <= 250),
  check (secure_url ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/')
);
create index product_images_product_position_idx on public.product_images(tenant_id, product_id, position);

alter table public.product_images enable row level security;
create policy "tenant members can read product images" on public.product_images
  for select to authenticated using (public.is_active_tenant_member(tenant_id));
revoke insert, update, delete on public.product_images from anon, authenticated;

create or replace function public.register_product_image(
  p_tenant_id uuid, p_product_id uuid, p_public_id text, p_secure_url text, p_alt_text text, p_position integer
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  cloud_name text := current_setting('app.cloudinary_cloud_name', true);
  clean_public_id text := trim(coalesce(p_public_id,''));
  clean_url text := trim(coalesce(p_secure_url,''));
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner','manager','catalog_editor']::public.membership_role[]) then
    raise exception 'You do not have permission to manage product images' using errcode='42501';
  end if;
  if not exists(select 1 from public.products where id=p_product_id and tenant_id=p_tenant_id) then
    raise exception 'Product not found in this workspace' using errcode='P0002';
  end if;
  if clean_public_id !~ ('^commerce/' || p_tenant_id::text || '/' || p_product_id::text || '/[A-Za-z0-9_./-]+$') then
    raise exception 'Image public ID is outside the product upload folder' using errcode='22023';
  end if;
  if clean_url !~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/image/upload/' then
    raise exception 'Use a secure Cloudinary image URL' using errcode='22023';
  end if;
  if length(coalesce(p_alt_text,'')) > 250 or p_position is null or p_position < 0 or p_position > 1000 then
    raise exception 'Invalid image metadata' using errcode='22023';
  end if;
  insert into public.product_images(tenant_id,product_id,public_id,secure_url,alt_text,position)
  values(p_tenant_id,p_product_id,clean_public_id,clean_url,trim(coalesce(p_alt_text,'')),p_position)
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'That image is already registered for this business' using errcode='23505';
end;
$$;
revoke all on function public.register_product_image(uuid,uuid,text,text,text,integer) from public, anon;
grant execute on function public.register_product_image(uuid,uuid,text,text,text,integer) to authenticated;
