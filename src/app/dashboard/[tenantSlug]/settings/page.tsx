import { requireTenantAccess } from "@/lib/access";
import { failLoad } from "@/lib/access/load-failure";
import { storeDisplayAddress, storeUrl } from "@/lib/store-url";
import StoreProfileForm, { type StoreProfile } from "./store-profile-form";

export default async function StoreProfilePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug, { permission: "settings.store.manage", area: "the store profile", path: "/settings" });
  if (access.denied) return access.denied;
  const { supabase, tenant } = access;

  const { data: profile, error } = await supabase.from("store_profiles")
    .select("tagline, about, logo_url, banner_url, owner_name, owner_title, owner_bio, owner_photo_url, phone, whatsapp, email, address_line, town, county, opening_hours, website_url, facebook_url, instagram_url, tiktok_url")
    .eq("tenant_id", tenant.id).maybeSingle();
  if (error) failLoad("store profile #1", error);

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
