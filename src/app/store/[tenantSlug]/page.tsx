import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Logo from "@/components/logo";
import StoreApp, { type StoreProduct, type StoreBuyer } from "./store-app";
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
  const [{ data, error }, { data: profileData, error: profileError }, { data: bestData }] = await Promise.all([
    supabase.rpc("get_public_storefront", { p_store_slug: tenantSlug }),
    supabase.rpc("get_public_store_profile", { p_store_slug: tenantSlug }),
    supabase.rpc("get_public_best_sellers", { p_store_slug: tenantSlug, p_limit: 8 }),
  ]);
  if (error || profileError) {
    return <main className="storefront-page"><Link href="/">Commerce Workspace</Link><section className="empty-state"><h1>Store temporarily unavailable</h1><p>The public catalogue could not be loaded. The store owner may need to finish setup.</p></section></main>;
  }
  const profile = ((profileData ?? []) as PublicStoreProfile[])[0];
  if (!profile) {
    return <main className="storefront-page"><Link href="/">Commerce Workspace</Link><section className="empty-state"><h1>Store not found</h1><p>This store does not exist or is no longer active.</p></section></main>;
  }
  const rows = (data ?? []) as StorefrontRow[];
  const products: StoreProduct[] = Array.from(new Map(rows.map(row => [row.product_id, row])).values()).map(product => ({
    product_id: product.product_id,
    product_title: product.product_title,
    product_description: product.product_description,
    category_name: product.category_name,
    images: product.images ?? [],
    variants: rows.filter(row => row.product_id === product.product_id).map(variant => ({
      variant_id: variant.variant_id,
      variant_title: variant.variant_title,
      price_minor: variant.price_minor,
      currency: variant.currency,
      available_quantity: variant.available_quantity,
    })),
  }));
  const bestSellerIds = ((bestData ?? []) as { product_id: string }[]).map(row => row.product_id);

  // Buyer account (optional). Any failure here just means the visitor browses as a guest.
  let buyer: StoreBuyer = null;
  let wishlist: string[] = [];
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) {
      const [{ data: bp }, { data: wl }] = await Promise.all([
        supabase.from("buyer_profiles").select("full_name, phone, default_address").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("get_my_wishlist_ids", { p_store_slug: tenantSlug }),
      ]);
      const meta = (user.user_metadata ?? {}) as { full_name?: string; phone?: string };
      buyer = {
        email: user.email ?? null,
        name: bp?.full_name ?? meta.full_name ?? "",
        phone: bp?.phone ?? meta.phone ?? "",
        address: bp?.default_address ?? "",
      };
      wishlist = ((wl ?? []) as string[]).filter(id => typeof id === "string");
    }
  } catch {
    buyer = null;
  }

  return <main className="storefront-page">
    <StoreApp
      storeSlug={tenantSlug}
      profile={profile}
      products={products}
      bestSellerIds={bestSellerIds}
      buyer={buyer}
      initialWishlist={wishlist}
      aboutSlot={<>
        <StoreAbout profile={profile} />
        <footer className="storefront-footer">
          <p><strong>{profile.store_name}</strong>{profile.town ? ` · ${[profile.town, profile.county].filter(Boolean).join(", ")}` : ""}</p>
          <p>Orders are confirmed by the shop. Online payment is not enabled.</p>
          <a className="powered-by" href={process.env.NEXT_PUBLIC_APP_URL ?? "/"} aria-label="Powered by Commerce Workspace">
            <span>Powered by</span> <Logo size={26} />
          </a>
        </footer>
      </>}
    />
  </main>;
}
