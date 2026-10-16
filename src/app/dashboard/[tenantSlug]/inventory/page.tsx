import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import StockMovementForm from "./stock-movement-form";
import RoleAccessDenied from "../role-access-denied";

type ProductRow = { id: string; title: string };
type VariantRow = { id: string; product_id: string; sku: string | null; title: string; price_minor: number; currency: string };
type BalanceRow = { variant_id: string; location_id: string; on_hand: number; reserved: number };

export default async function InventoryPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/auth?next=${encodeURIComponent(`/dashboard/${tenantSlug}/inventory`)}`);

  const { data: tenant } = await supabase.from("tenants")
    .select("id, name, slug, status").eq("slug", tenantSlug).maybeSingle();
  if (!tenant || tenant.status !== "active") notFound();

  const { data: membership } = await supabase.from("tenant_memberships")
    .select("role").eq("tenant_id", tenant.id).eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!membership) notFound();
  if (!["owner", "manager", "stock_clerk"].includes(membership.role)) {
    return <RoleAccessDenied tenantSlug={tenantSlug} role={membership.role} area="inventory" />;
  }

  const [{ data: locations, error: locationsError }, { data: productData, error: productError }, { data: variantData, error: variantError }] = await Promise.all([
    supabase.from("inventory_locations").select("id, name, code, active").eq("tenant_id", tenant.id).eq("active", true).order("name"),
    supabase.from("products").select("id, title").eq("tenant_id", tenant.id).order("title"),
    supabase.from("product_variants").select("id, product_id, sku, title, price_minor, currency").eq("tenant_id", tenant.id).order("created_at", { ascending: false })
  ]);

  if (locationsError || productError || variantError) {
    return <main className="dashboard-page"><Link href="/dashboard">← Your businesses</Link><p role="alert">Could not load inventory. Confirm that all Supabase migrations have been applied.</p></main>;
  }

  const products = (productData ?? []) as ProductRow[];
  const variants = (variantData ?? []) as VariantRow[];
  const activeLocation = (locations ?? [])[0];
  const { data: balanceData, error: balanceError } = activeLocation
    ? await supabase.from("inventory_balances").select("variant_id, location_id, on_hand, reserved")
        .eq("tenant_id", tenant.id).eq("location_id", activeLocation.id)
    : { data: [], error: null };
  if (balanceError) {
    return <main className="dashboard-page"><Link href="/dashboard">← Your businesses</Link><p role="alert">Could not load stock balances.</p></main>;
  }

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
  const canManage = ["owner", "manager", "stock_clerk"].includes(membership.role);
  const canManageProducts = ["owner", "manager", "catalog_editor"].includes(membership.role);

  return (
    <main className="dashboard-page">
      <header className="dashboard-header"><div><p className="eyebrow">INVENTORY</p><h1>{tenant.name}</h1><p className="auth-description">Stock balances and recorded movements for {activeLocation?.name ?? "your locations"}.</p></div><span className="workspace-status">{membership.role.replaceAll("_", " ")}</span></header>
      <section className="workspace-list">
        {!activeLocation && <div className="empty-state"><h2>No active stock location</h2><p>Apply the latest migration to create the default Main store location.</p></div>}
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
