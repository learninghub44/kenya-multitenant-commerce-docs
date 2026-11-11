import { notFound, redirect } from "next/navigation";
import { getTenantAccess } from "@/lib/tenant-access";
import { hasTenantPermission } from "@/lib/tenant-permissions";
import { storeDisplayAddress, storeUrl } from "@/lib/store-url";
import RoleAccessDenied from "../role-access-denied";
import StoreProfileForm, { type StoreProfile } from "./store-profile-form";

export default async function StoreProfilePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await getTenantAccess(tenantSlug);
  if (access.reason === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/${tenantSlug}/settings`)}`);
  }
  if (access.reason === "tenant_error") throw new Error("Could not verify this business workspace.");
  if (access.reason === "membership_error") throw new Error("Could not verify your business access.");
  if (!access.tenant || !access.membership || !access.user) notFound();
  const { supabase, tenant, membership } = access;
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
