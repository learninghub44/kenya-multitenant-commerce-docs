import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PublicCheckout from "./public-checkout";

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
  const { data, error } = await supabase.rpc("get_public_storefront", { p_store_slug: tenantSlug });
  if (error) {
    return <main className="storefront-page"><Link href="/">Commerce Workspace</Link><section className="empty-state"><h1>Store temporarily unavailable</h1><p>The public catalogue could not be loaded. The store owner may need to finish setup.</p></section></main>;
  }
  const rows = (data ?? []) as StorefrontRow[];
  if (rows.length === 0) {
    return <main className="storefront-page"><Link href="/">Commerce Workspace</Link><section className="empty-state"><h1>Store not found or no published products</h1><p>This store may be inactive or its products may still be drafts.</p></section></main>;
  }

  const products = Array.from(new Map(rows.map(row => [row.product_id, row])).values()).map(product => ({
    ...product,
    variants: rows.filter(row => row.product_id === product.product_id)
  }));

  return <main className="storefront-page">
    <header className="storefront-header">
      <div><p className="eyebrow">ONLINE STORE</p><h1>{rows[0].store_name}</h1><p>Browse the published catalogue.</p></div>
      <span className="workspace-status">{products.length} products</span>
    </header>
    <section className="storefront-grid" aria-label="Published products">
      {products.map(product => <article className="store-product-card" key={product.product_id}>
        {product.images[0] && <Image src={product.images[0].url} alt={product.images[0].alt || product.product_title} width={640} height={420} unoptimized className="store-product-image" />}
        <div className="store-product-content">
          {product.category_name && <p className="eyebrow">{product.category_name}</p>}
          <h2>{product.product_title}</h2>
          {product.product_description && <p>{product.product_description}</p>}
          <div className="store-variant-list">
            {product.variants.map(variant => <div className="store-variant" key={variant.variant_id}>
              <span>{variant.variant_title}{variant.sku ? <small>SKU {variant.sku}</small> : null}</span>
              <strong>{new Intl.NumberFormat("en-KE", { style: "currency", currency: variant.currency }).format(variant.price_minor / 100)}</strong>
              {variant.available_quantity !== null && <small>{variant.available_quantity > 0 ? "In stock" : "Out of stock"}</small>}
            </div>)}
          </div>
        </div>
      </article>)}
    </section>
    <PublicCheckout storeSlug={tenantSlug} products={products.map(product => ({
      product_id: product.product_id,
      product_title: product.product_title,
      variants: product.variants.map(variant => ({
        variant_id: variant.variant_id, variant_title: variant.variant_title,
        price_minor: variant.price_minor, currency: variant.currency,
        available_quantity: variant.available_quantity
      }))
    }))} />
    <footer className="storefront-footer"><p>Public catalogue and order requests · Online payment is not enabled.</p></footer>
  </main>;
}
