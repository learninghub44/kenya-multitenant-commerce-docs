import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storeDisplayAddress, storeUrl } from "@/lib/store-url";
import RoleAccessDenied from "../role-access-denied";
import StoreProfileForm, { type StoreProfile } from "./store-profile-form";

export default async function StoreProfilePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/auth?next=${encodeURIComponent(`/dashboard/${tenantSlug}/settings`)}`);

  const { data: tenant, error: tenantError } = await supabase.from("tenants")
    .select("id, name, slug, status").eq("slug", tenantSlug).maybeSingle();
  if (tenantError || !tenant || tenant.status !== "active") notFound();

  const { data: membership } = await supabase.from("tenant_memberships")
    .select("role").eq("tenant_id", tenant.id).eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!membership) notFound();
  if (!["owner", "manager"].includes(membership.role)) {
    return <RoleAccessDenied tenantSlug={tenantSlug} role={membership.role} area="the store profile" />;
  }

  const { data: profile, error } = await supabase.from("store_profiles")
    .select("tagline, about, logo_url, banner_url, owner_name, owner_title, owner_bio, owner_photo_url, phone, whatsapp, email, address_line, town, county, opening_hours, website_url, facebook_url, instagram_url, tiktok_url")
    .eq("tenant_id", tenant.id).maybeSingle();
  if (error) {
    return <main className="dashboard-page"><p className="dashboard-alert" role="alert">Could not load the store profile. Confirm the store profile migration is applied.</p></main>;
  }

  return <main className="dashboard-page">
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">Your storefront</p>
        <h1>Store profile</h1>
        <p className="auth-description">The details customers see on {tenant.name}&apos;s shop.</p>
      </div>
    </header>
    <section className="store-link-card" aria-label="Your store link">
      <div><small>Your shop link</small><strong>{storeDisplayAddress(tenant.slug)}</strong></div>
      <a className="workspace-action" href={storeUrl(tenant.slug)} target="_blank" rel="noreferrer">Open shop <span aria-hidden="true">↗</span></a>
    </section>
    <StoreProfileForm tenantId={tenant.id} initial={(profile ?? {}) as Partial<StoreProfile>} />
  </main>;
}
