import Link from "next/link";
import { requireTenantAccess } from "@/lib/access";
import { failLoad } from "@/lib/access/load-failure";
import { hasPermission } from "@/lib/permissions";
import StockMovementForm from "./stock-movement-form";

type ProductRow = { id: string; title: string };
type VariantRow = { id: string; product_id: string; sku: string | null; title: string; price_minor: number; currency: string };
type BalanceRow = { variant_id: string; location_id: string; on_hand: number; reserved: number };

export default async function InventoryPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug, { permission: "inventory.adjust", area: "inventory", path: "/inventory" });
  if (access.denied) return access.denied;
  const { supabase, tenant, role } = access;

  const [{ data: locations, error: locationsError }, { data: productData, error: productError }, { data: variantData, error: variantError }] = await Promise.all([
    supabase.from("inventory_locations").select("id, name, code, active").eq("tenant_id", tenant.id).eq("active", true).order("name"),
    supabase.from("products").select("id, title").eq("tenant_id", tenant.id).order("title"),
    supabase.from("product_variants").select("id, product_id, sku, title, price_minor, currency").eq("tenant_id", tenant.id).order("created_at", { ascending: false })
  ]);

  if (locationsError || productError || variantError) failLoad("inventory #1", locationsError ?? productError ?? variantError);

  const products = (productData ?? []) as ProductRow[];
  const variants = (variantData ?? []) as VariantRow[];
  const activeLocation = (locations ?? [])[0];
  const { data: balanceData, error: balanceError } = activeLocation
    ? await supabase.from("inventory_balances").select("variant_id, location_id, on_hand, reserved")
        .eq("tenant_id", tenant.id).eq("location_id", activeLocation.id)
    : { data: [], error: null };
  if (balanceError) failLoad("inventory #2", balanceError);

  const balances = (balanceData ?? []) as BalanceRow[];
  const productById = new Map(products.map(product => [product.id, product]));
  const variantOptions = variants.map(variant => {
    const product = productById.get(variant.product_id);
    const balance = balances.find(item => item.variant_id === variant.id);
    return {
      id: variant.id,
      label: `${product?.title ?? "Unknown product"}${variant.sku ? ` · ${variant.sku}` : ""}`,
      onHand: balance?.on_hand ?? 0
    };
  });
  const canManage = hasPermission(role, "inventory.adjust");
  const canManageProducts = hasPermission(role, "products.update");

  return (
    <main className="dashboard-page">
      <header className="dashboard-header"><div><p className="eyebrow">Inventory</p><h1>{tenant.name}</h1><p className="auth-description">Stock balances and recorded movements for {activeLocation?.name ?? "your locations"}.</p></div><span className="workspace-status">{role.replaceAll("_", " ")}</span></header>
      <section className="workspace-list">
        {!activeLocation && <div className="empty-state"><h2>No active stock location</h2><p>Your Main store location has not been set up yet. Contact support if this does not resolve.</p></div>}
        {variants.length === 0 ? <div className="empty-state"><h2>No product variants yet</h2><p>Create a product first. Every product starts with a default variant.</p>{canManageProducts ? <Link className="workspace-action" href={`/dashboard/${tenant.slug}/products`}>Open products →</Link> : <p className="field-help">Ask a workspace owner, manager or catalog editor to add the first product.</p>}</div> : variants.map(variant => {
          const product = productById.get(variant.product_id);
          const balance = balances.find(item => item.variant_id === variant.id);
          const onHand = balance?.on_hand ?? 0;
          const reserved = balance?.reserved ?? 0;
          return <article className="workspace-card product-card" key={variant.id}>
            <div><h2>{product?.title ?? "Unknown product"}</h2><p>{variant.sku ? `SKU ${variant.sku}` : "No SKU"} · {variant.title}</p><span className="workspace-status">{onHand - reserved} available · {reserved} reserved</span></div>
            <strong className="product-price">{onHand} on hand</strong>
          </article>;
        })}
      </section>
      {canManage && activeLocation ? <StockMovementForm tenantId={tenant.id} locationId={activeLocation.id} variants={variantOptions} /> : !canManage ? <p className="field-help">Your role can view stock but cannot receive or adjust it.</p> : null}
    </main>
  );
}
