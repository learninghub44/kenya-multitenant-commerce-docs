-- Tenant team invitations and immutable activity history.
-- All privileged writes and reads are exposed through narrow auth.uid()-checked RPCs.

create table public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  email text not null check (email = lower(trim(email)) and length(email) between 3 and 254),
  role public.membership_role not null check (role <> 'owner'),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create unique index tenant_invitations_one_pending_email
  on public.tenant_invitations (tenant_id, email)
  where accepted_at is null and revoked_at is null;

create index tenant_invitations_tenant_created_idx
  on public.tenant_invitations (tenant_id, created_at desc);

alter table public.tenant_invitations enable row level security;
-- No direct client policies. Access is through owner-checked RPCs only.

create or replace function public.create_tenant_invitation(
  p_tenant_id uuid,
  p_email text,
  p_role public.membership_role
)
returns table(invitation_id uuid, invitation_token text, invitation_expires_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  clean_email text := lower(trim(coalesce(p_email, '')));
  raw_token text := encode(gen_random_bytes(32), 'hex');
  expiry timestamptz := now() + interval '7 days';
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if not public.has_tenant_role(p_tenant_id, array['owner']::public.membership_role[]) then
    raise exception 'Only an owner can invite team members' using errcode = '42501';
  end if;
  if length(clean_email) > 254 or clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;
  if p_role is null or p_role = 'owner' then
    raise exception 'Owner access cannot be granted by invitation' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.tenant_memberships m
    join auth.users u on u.id = m.user_id
    where m.tenant_id = p_tenant_id and lower(u.email) = clean_email and m.active
  ) then
    raise exception 'This person is already an active team member' using errcode = '23505';
  end if;

  update public.tenant_invitations
  set revoked_at = now()
  where tenant_id = p_tenant_id and email = clean_email
    and accepted_at is null and revoked_at is null;

  insert into public.tenant_invitations(tenant_id, email, role, token_hash, invited_by, expires_at)
  values (p_tenant_id, clean_email, p_role, encode(digest(raw_token, 'sha256'), 'hex'), auth.uid(), expiry)
  returning id into new_id;

  insert into public.audit_events(tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_tenant_id, auth.uid(), 'team.invitation_created', 'tenant_invitation', new_id::text,
    jsonb_build_object('role', p_role::text));

  return query select new_id, raw_token, expiry;
end;
$$;

create or replace function public.list_tenant_team(p_tenant_id uuid)
returns table(membership_id uuid, user_id uuid, member_email text, role public.membership_role, active boolean, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner']::public.membership_role[]) then
    raise exception 'Only an owner can view the team list' using errcode = '42501';
  end if;
  return query
    select m.id, m.user_id, u.email::text, m.role, m.active, m.created_at
    from public.tenant_memberships m
    join auth.users u on u.id = m.user_id
    where m.tenant_id = p_tenant_id
    order by (m.role = 'owner') desc, m.created_at asc;
end;
$$;

create or replace function public.list_tenant_invitations(p_tenant_id uuid)
returns table(invitation_id uuid, invite_email text, invite_role public.membership_role, expires_at timestamptz, accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner']::public.membership_role[]) then
    raise exception 'Only an owner can view invitations' using errcode = '42501';
  end if;
  return query
    select i.id, i.email, i.role, i.expires_at, i.accepted_at, i.revoked_at, i.created_at
    from public.tenant_invitations i
    where i.tenant_id = p_tenant_id
      and i.created_at > now() - interval '90 days'
    order by i.created_at desc;
end;
$$;

create or replace function public.revoke_tenant_invitation(p_tenant_id uuid, p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner']::public.membership_role[]) then
    raise exception 'Only an owner can revoke invitations' using errcode = '42501';
  end if;
  update public.tenant_invitations
  set revoked_at = now()
  where id = p_invitation_id and tenant_id = p_tenant_id
    and accepted_at is null and revoked_at is null;
  if not found then raise exception 'Invitation is no longer pending' using errcode = 'P0002'; end if;
  insert into public.audit_events(tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_tenant_id, auth.uid(), 'team.invitation_revoked', 'tenant_invitation', p_invitation_id::text, '{}'::jsonb);
end;
$$;

create or replace function public.accept_tenant_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  invite public.tenant_invitations%rowtype;
  current_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise exception 'This invitation is invalid or has expired' using errcode = '22023';
  end if;
  select * into invite
  from public.tenant_invitations i
  where i.token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;
  if not found or invite.accepted_at is not null or invite.revoked_at is not null or invite.expires_at <= now() then
    raise exception 'This invitation is invalid, expired or already used' using errcode = '22023';
  end if;
  if current_email = '' or current_email <> invite.email then
    raise exception 'Sign in with the email address that received this invitation' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.tenant_memberships m
    where m.tenant_id = invite.tenant_id and m.user_id = auth.uid() and m.active
  ) then
    raise exception 'You are already an active member of this workspace' using errcode = '23505';
  end if;

  insert into public.tenant_memberships as existing(tenant_id, user_id, role, active)
  values (invite.tenant_id, auth.uid(), invite.role, true)
  on conflict (tenant_id, user_id) do update
    set role = excluded.role, active = true
    where existing.active = false;

  update public.tenant_invitations set accepted_at = now() where id = invite.id;
  insert into public.audit_events(tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (invite.tenant_id, auth.uid(), 'team.invitation_accepted', 'tenant_membership', auth.uid()::text,
    jsonb_build_object('role', invite.role::text));
  return invite.tenant_id;
end;
$$;

create or replace function public.set_tenant_member_role(
  p_tenant_id uuid,
  p_membership_id uuid,
  p_role public.membership_role
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target public.tenant_memberships%rowtype;
  owner_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner']::public.membership_role[]) then
    raise exception 'Only an owner can change team roles' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 0));
  if not public.has_tenant_role(p_tenant_id, array['owner']::public.membership_role[]) then
    raise exception 'Only an owner can change team roles' using errcode = '42501';
  end if;
  if p_role is null then raise exception 'Choose a valid team role' using errcode = '22023'; end if;
  select * into target from public.tenant_memberships
  where id = p_membership_id and tenant_id = p_tenant_id and active for update;
  if not found then raise exception 'Active team member not found' using errcode = 'P0002'; end if;
  if target.role = 'owner' and p_role <> 'owner' then
    select count(*) into owner_count from public.tenant_memberships
    where tenant_id = p_tenant_id and active and role = 'owner';
    if owner_count <= 1 then raise exception 'A workspace must keep at least one active owner' using errcode = '23514'; end if;
  end if;
  update public.tenant_memberships set role = p_role where id = target.id;
  insert into public.audit_events(tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_tenant_id, auth.uid(), 'team.role_changed', 'tenant_membership', target.id::text,
    jsonb_build_object('from_role', target.role::text, 'to_role', p_role::text));
end;
$$;

create or replace function public.remove_tenant_member(p_tenant_id uuid, p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target public.tenant_memberships%rowtype;
  owner_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner']::public.membership_role[]) then
    raise exception 'Only an owner can remove team members' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 0));
  if not public.has_tenant_role(p_tenant_id, array['owner']::public.membership_role[]) then
    raise exception 'Only an owner can remove team members' using errcode = '42501';
  end if;
  select * into target from public.tenant_memberships
  where id = p_membership_id and tenant_id = p_tenant_id and active for update;
  if not found then raise exception 'Active team member not found' using errcode = 'P0002'; end if;
  if target.role = 'owner' then
    select count(*) into owner_count from public.tenant_memberships
    where tenant_id = p_tenant_id and active and role = 'owner';
    if owner_count <= 1 then raise exception 'A workspace must keep at least one active owner' using errcode = '23514'; end if;
  end if;
  update public.tenant_memberships set active = false where id = target.id;
  insert into public.audit_events(tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (p_tenant_id, auth.uid(), 'team.member_removed', 'tenant_membership', target.id::text,
    jsonb_build_object('role', target.role::text));
end;
$$;

create or replace function public.list_tenant_audit_events(p_tenant_id uuid, p_limit integer default 50)
returns table(event_id bigint, actor_email text, action text, entity_type text, entity_id text, request_id text, occurred_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not public.has_tenant_role(p_tenant_id, array['owner']::public.membership_role[]) then
    raise exception 'Only an owner can view activity history' using errcode = '42501';
  end if;
  return query
    select a.id, u.email::text, a.action, a.entity_type, a.entity_id, a.request_id, a.created_at
    from public.audit_events a
    left join auth.users u on u.id = a.actor_user_id
    where a.tenant_id = p_tenant_id
    order by a.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;

revoke all on function public.create_tenant_invitation(uuid,text,public.membership_role) from public, anon;
revoke all on function public.list_tenant_team(uuid) from public, anon;
revoke all on function public.list_tenant_invitations(uuid) from public, anon;
revoke all on function public.revoke_tenant_invitation(uuid,uuid) from public, anon;
revoke all on function public.accept_tenant_invitation(text) from public, anon;
revoke all on function public.set_tenant_member_role(uuid,uuid,public.membership_role) from public, anon;
revoke all on function public.remove_tenant_member(uuid,uuid) from public, anon;
revoke all on function public.list_tenant_audit_events(uuid,integer) from public, anon;
grant execute on function public.create_tenant_invitation(uuid,text,public.membership_role) to authenticated;
grant execute on function public.list_tenant_team(uuid) to authenticated;
grant execute on function public.list_tenant_invitations(uuid) to authenticated;
grant execute on function public.revoke_tenant_invitation(uuid,uuid) to authenticated;
grant execute on function public.accept_tenant_invitation(text) to authenticated;
grant execute on function public.set_tenant_member_role(uuid,uuid,public.membership_role) to authenticated;
grant execute on function public.remove_tenant_member(uuid,uuid) to authenticated;
grant execute on function public.list_tenant_audit_events(uuid,integer) to authenticated;
