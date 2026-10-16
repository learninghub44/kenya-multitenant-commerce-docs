import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import NewProductForm from "./new-product-form";
import ProductEditor from "./product-editor";

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  created_at: string;
};

type VariantRow = {
  product_id: string;
  sku: string | null;
  price_minor: number;
  currency: string;
};

export default async function ProductsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth?next=/dashboard");

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, slug, status")
    .eq("slug", tenantSlug)
    .maybeSingle();

  // The tenant RLS policy returns no row for users outside that workspace.
  if (tenantError || !tenant || tenant.status !== "active") notFound();

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!membership) notFound();

  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id, title, slug, description, status, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });
  if (productsError) {
    return <main className="dashboard-page"><Link href="/dashboard">← Your businesses</Link><p role="alert">Could not load products. Confirm the Supabase migrations are applied.</p></main>;
  }

  const products = (productsData ?? []) as ProductRow[];
  let variants: VariantRow[] = [];
  if (products.length) {
    const { data, error } = await supabase.from("product_variants")
      .select("id, product_id, sku, price_minor, currency")
      .eq("tenant_id", tenant.id)
      .in("product_id", products.map(product => product.id));
    if (error) {
      return <main className="dashboard-page"><Link href="/dashboard">← Your businesses</Link><p role="alert">Could not load product prices. Confirm the database migration.</p></main>;
    }
    variants = (data ?? []) as VariantRow[];
  }

  const canManage = ["owner", "manager", "catalog_editor"].includes(membership.role);
  return (
    <main className="dashboard-page">
      <p><Link href="/dashboard">← Your businesses</Link> · <Link href={`/dashboard/${tenant.slug}/inventory`}>Inventory and stock →</Link> · <Link href={`/dashboard/${tenant.slug}/categories`}>Manage categories →</Link></p>
      <header className="dashboard-header"><div><p className="eyebrow">PRODUCT CATALOGUE</p><h1>{tenant.name}</h1><p className="auth-description">Manage your products and draft prices.</p></div><span className="workspace-status">{membership.role.replaceAll("_", " ")}</span></header>
      <section className="workspace-list">
        {products.length === 0 ? <div className="empty-state"><h2>No products yet</h2><p>Add your first product. It will be saved as a draft and will not appear on a public storefront.</p></div> : products.map(product => {
          const variant = variants.find(item => item.product_id === product.id);
          return <article className="workspace-card product-card" key={product.id}>
            <div><h2>{product.title}</h2><p>/{product.slug}{variant?.sku ? ` · SKU ${variant.sku}` : ""}</p>{product.description && <p>{product.description}</p>}<span className="workspace-status">{product.status}</span></div>
            <div className="product-card-side"><strong className="product-price">{variant ? new Intl.NumberFormat("en-KE", { style: "currency", currency: variant.currency }).format(variant.price_minor / 100) : "Price unavailable"}</strong>{canManage && variant && <ProductEditor tenantId={tenant.id} productId={product.id} variantId={variant.id} initialTitle={product.title} initialSlug={product.slug} initialDescription={product.description} initialPriceMinor={variant.price_minor} initialSku={variant.sku} initialStatus={product.status} />}</div>
          </article>;
        })}
      </section>
      {canManage ? <NewProductForm tenantId={tenant.id} /> : <p className="field-help">Your role can view the catalogue but cannot create products.</p>}
    </main>
  );
}
