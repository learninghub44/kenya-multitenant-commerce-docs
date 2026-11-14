import { requireTenantAccess } from "@/lib/access";
import { failLoad } from "@/lib/access/load-failure";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import { ModalButton } from "@/components/ui/modal";
import NewProductForm from "./new-product-form";
import ProductEditor from "./product-editor";
import ProductCategoryAssignment from "./product-category-assignment";
import VariantManager, { type ManagedVariant } from "./variant-manager";
import ProductImageManager from "./product-image-manager";
import { DashboardEmptyState, DashboardPageHeader } from "@/components/dashboard-primitives";

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
  const access = await requireTenantAccess(tenantSlug, { permission: "products.update", area: "the product catalogue", path: "/products" });
  if (access.denied) return access.denied;
  const { supabase, tenant, role } = access;

  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id, title, slug, description, status, category_id, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });
  if (productsError) failLoad("products #1", productsError);

  const products = (productsData ?? []) as ProductRow[];
  const { data: categoriesData, error: categoriesError } = await supabase.from("categories")
    .select("id, name, status").eq("tenant_id", tenant.id).eq("status", "published").order("name");
  if (categoriesError) failLoad("products #2", categoriesError);
  const categories = (categoriesData ?? []) as CategoryRow[];
  let variants: VariantRow[] = [];
  if (products.length) {
    const { data, error } = await supabase.from("product_variants")
      .select("id, product_id, title, sku, price_minor, currency, options, status")
      .eq("tenant_id", tenant.id)
      .in("product_id", products.map(product => product.id));
    if (error) failLoad("product prices", error);
    variants = (data ?? []) as VariantRow[];
  }

  const { data: imageData, error: imageError } = products.length
    ? await supabase.from("product_images").select("id, product_id, secure_url, alt_text, position")
        .eq("tenant_id", tenant.id).in("product_id", products.map(product => product.id)).order("position")
    : { data: [], error: null };
  if (imageError) failLoad("products #3", imageError);
  const images = (imageData ?? []) as ProductImageRow[];

  const canManage = hasPermission(role, "products.update");
  return (
    <main className="dashboard-page">
      <DashboardPageHeader eyebrow={tenant.name} title="Products" aside={<><span className="workspace-status">{role.replaceAll("_", " ")}</span>{canManage && <Link className="workspace-action" href={`/dashboard/${tenant.slug}/products/import`}>Import</Link>}{canManage && <ModalButton label="Add product" icon="+" variant="primary" title="Add product" openOnHash="add-product"><NewProductForm tenantId={tenant.id} /></ModalButton>}</>} />
      <section className="workspace-list">
        {products.length === 0 ? <DashboardEmptyState title="No products yet" description="Add a product or import your catalogue." /> : products.map(product => {
          const productVariants = variants.filter(item => item.product_id === product.id);
          const variant = productVariants.find(item => item.status !== "archived");
          return <article className="workspace-card product-card" key={product.id}>
            <div><h2>{product.title}</h2><p>/{product.slug}{variant?.sku ? ` · SKU ${variant.sku}` : ""}</p>{product.description && <p>{product.description}</p>}<p className="product-category-label">{categories.find(category => category.id === product.category_id)?.name ?? "Uncategorized"}</p><span className="workspace-status">{product.status}</span></div>
            <div className="product-card-side"><strong className="product-price">{variant ? new Intl.NumberFormat("en-KE", { style: "currency", currency: variant.currency }).format(variant.price_minor / 100) : "Price unavailable"}</strong>{canManage && <ProductCategoryAssignment tenantId={tenant.id} productId={product.id} currentCategoryId={product.category_id} categories={categories} />}{canManage && variant && <ProductEditor tenantId={tenant.id} productId={product.id} variantId={variant.id} initialTitle={product.title} initialSlug={product.slug} initialDescription={product.description} initialPriceMinor={variant.price_minor} initialSku={variant.sku} initialStatus={product.status} />}
              {canManage && <VariantManager tenantId={tenant.id} productId={product.id} variants={productVariants} />}
              {canManage && <ProductImageManager tenantId={tenant.id} productId={product.id} images={images.filter(image => image.product_id === product.id)} />}</div>
          </article>;
        })}
      </section>
      {!canManage && <p className="field-help">Your role can view the catalogue but cannot create products.</p>}
    </main>
  );
}
