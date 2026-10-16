import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import NewProductForm from "./new-product-form";
import ProductEditor from "./product-editor";
import ProductCategoryAssignment from "./product-category-assignment";
import VariantManager, { type ManagedVariant } from "./variant-manager";
import ProductImageManager from "./product-image-manager";

type ProductRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  category_id: string | null;
  created_at: string;
};

type CategoryRow = { id: string; name: string; status: string };

type VariantRow = ManagedVariant & { product_id: string };
type ProductImageRow = { id: string; product_id: string; secure_url: string; alt_text: string; position: number };

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
    .select("id, title, slug, description, status, category_id, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });
  if (productsError) {
    return <main className="dashboard-page"><Link href="/dashboard">← Your businesses</Link><p role="alert">Could not load products. Confirm the Supabase migrations are applied.</p></main>;
  }

  const products = (productsData ?? []) as ProductRow[];
  const { data: categoriesData, error: categoriesError } = await supabase.from("categories")
    .select("id, name, status").eq("tenant_id", tenant.id).eq("status", "published").order("name");
  if (categoriesError) {
    return <main className="dashboard-page"><Link href="/dashboard">← Your businesses</Link><p role="alert">Could not load categories. Confirm the category migration is applied.</p></main>;
  }
  const categories = (categoriesData ?? []) as CategoryRow[];
  let variants: VariantRow[] = [];
  if (products.length) {
    const { data, error } = await supabase.from("product_variants")
      .select("id, product_id, title, sku, price_minor, currency, options, status")
      .eq("tenant_id", tenant.id)
      .in("product_id", products.map(product => product.id));
    if (error) {
      return <main className="dashboard-page"><Link href="/dashboard">← Your businesses</Link><p role="alert">Could not load product prices. Confirm the database migration.</p></main>;
    }
    variants = (data ?? []) as VariantRow[];
  }

  const { data: imageData, error: imageError } = products.length
    ? await supabase.from("product_images").select("id, product_id, secure_url, alt_text, position")
        .eq("tenant_id", tenant.id).in("product_id", products.map(product => product.id)).order("position")
    : { data: [], error: null };
  if (imageError) {
    return <main className="dashboard-page"><Link href="/dashboard">← Your businesses</Link><p role="alert">Could not load product images. Confirm the image migration is applied.</p></main>;
  }
  const images = (imageData ?? []) as ProductImageRow[];

  const canManage = ["owner", "manager", "catalog_editor"].includes(membership.role);
  return (
    <main className="dashboard-page">
      <p><Link href="/dashboard">← Your businesses</Link> · <Link href={`/dashboard/${tenant.slug}/inventory`}>Inventory and stock →</Link> · <Link href={`/dashboard/${tenant.slug}/categories`}>Manage categories →</Link> · <Link href={`/dashboard/${tenant.slug}/orders`}>Orders →</Link></p>
      <header className="dashboard-header"><div><p className="eyebrow">PRODUCT CATALOGUE</p><h1>{tenant.name}</h1><p className="auth-description">Manage your products and draft prices.</p></div><span className="workspace-status">{membership.role.replaceAll("_", " ")}</span></header>
      <section className="workspace-list">
        {products.length === 0 ? <div className="empty-state"><h2>No products yet</h2><p>Add your first product. It will be saved as a draft and will not appear on a public storefront.</p></div> : products.map(product => {
          const productVariants = variants.filter(item => item.product_id === product.id);
          const variant = productVariants.find(item => item.status !== "archived") ?? productVariants[0];
          return <article className="workspace-card product-card" key={product.id}>
            <div><h2>{product.title}</h2><p>/{product.slug}{variant?.sku ? ` · SKU ${variant.sku}` : ""}</p>{product.description && <p>{product.description}</p>}<p className="product-category-label">{categories.find(category => category.id === product.category_id)?.name ?? "Uncategorized"}</p><span className="workspace-status">{product.status}</span></div>
            <div className="product-card-side"><strong className="product-price">{variant ? new Intl.NumberFormat("en-KE", { style: "currency", currency: variant.currency }).format(variant.price_minor / 100) : "Price unavailable"}</strong>{canManage && <ProductCategoryAssignment tenantId={tenant.id} productId={product.id} currentCategoryId={product.category_id} categories={categories} />}{canManage && variant && <ProductEditor tenantId={tenant.id} productId={product.id} variantId={variant.id} initialTitle={product.title} initialSlug={product.slug} initialDescription={product.description} initialPriceMinor={variant.price_minor} initialSku={variant.sku} initialStatus={product.status} />}
              {canManage && <VariantManager tenantId={tenant.id} productId={product.id} variants={productVariants} />}
              {canManage && <ProductImageManager tenantId={tenant.id} productId={product.id} images={images.filter(image => image.product_id === product.id)} />}</div>
          </article>;
        })}
      </section>
      {canManage ? <NewProductForm tenantId={tenant.id} /> : <p className="field-help">Your role can view the catalogue but cannot create products.</p>}
    </main>
  );
}
