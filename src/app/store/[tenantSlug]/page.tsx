import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PublicCheckout from "./public-checkout";
import StorefrontCatalog from "./storefront-catalog";
import StoreAbout, { type PublicStoreProfile } from "./store-about";

type StorefrontRow = {
  store_name: string;
  store_slug: string;
  product_id: string;
  product_title: string;
  product_slug: string;
  product_description: string;
  category_name: string | null;
  variant_id: string;
  variant_title: string;
  sku: string | null;
  price_minor: number;
  currency: string;
  available_quantity: number | null;
  images: { url: string; alt: string; position: number }[];
};

export default async function StorefrontPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/.test(tenantSlug)) notFound();

  const supabase = await createSupabaseServerClient();
  const { error: refreshError } = await supabase.rpc("refresh_public_store_reservations", { p_store_slug: tenantSlug });
  if (refreshError) {
    return <main className="storefront-page"><Link href="/">Commerce Workspace</Link><section className="empty-state"><h1>Store temporarily unavailable</h1><p>Stock availability could not be refreshed safely. Please try again shortly.</p></section></main>;
  }
  const [{ data, error }, { data: profileData, error: profileError }] = await Promise.all([
    supabase.rpc("get_public_storefront", { p_store_slug: tenantSlug }),
    supabase.rpc("get_public_store_profile", { p_store_slug: tenantSlug }),
  ]);
  if (error || profileError) {
    return <main className="storefront-page"><Link href="/">Commerce Workspace</Link><section className="empty-state"><h1>Store temporarily unavailable</h1><p>The public catalogue could not be loaded. The store owner may need to finish setup.</p></section></main>;
  }
  const profile = ((profileData ?? []) as PublicStoreProfile[])[0];
  if (!profile) {
    return <main className="storefront-page"><Link href="/">Commerce Workspace</Link><section className="empty-state"><h1>Store not found</h1><p>This store does not exist or is no longer active.</p></section></main>;
  }
  const rows = (data ?? []) as StorefrontRow[];

  const products = Array.from(new Map(rows.map(row => [row.product_id, row])).values()).map(product => ({
    ...product,
    variants: rows.filter(row => row.product_id === product.product_id)
  }));

  return <main className="storefront-page">
    <StorefrontCatalog storeName={profile.store_name} profile={{
      tagline: profile.tagline, about: profile.about, logo_url: profile.logo_url, banner_url: profile.banner_url,
      phone: profile.phone, whatsapp: profile.whatsapp, town: profile.town, county: profile.county
    }} products={products.map(product => ({
      product_id: product.product_id,
      product_title: product.product_title,
      product_description: product.product_description,
      category_name: product.category_name,
      images: product.images,
      variants: product.variants.map(variant => ({
        variant_id: variant.variant_id,
        variant_title: variant.variant_title,
        price_minor: variant.price_minor,
        currency: variant.currency,
        available_quantity: variant.available_quantity
      }))
    }))} />
    {products.length > 0 && <div id="order-request">
      <PublicCheckout storeSlug={tenantSlug} products={products.map(product => ({
        product_id: product.product_id,
        product_title: product.product_title,
        variants: product.variants.map(variant => ({
          variant_id: variant.variant_id, variant_title: variant.variant_title,
          price_minor: variant.price_minor, currency: variant.currency,
          available_quantity: variant.available_quantity
        }))
      }))} />
    </div>}
    <StoreAbout profile={profile} />
    <footer className="storefront-footer">
      <p><strong>{profile.store_name}</strong>{profile.town ? ` · ${[profile.town, profile.county].filter(Boolean).join(", ")}` : ""}</p>
      <p>Order requests are confirmed by the store. Online payment is not enabled.</p>
      <p>Powered by Commerce Workspace</p>
    </footer>
  </main>;
}
