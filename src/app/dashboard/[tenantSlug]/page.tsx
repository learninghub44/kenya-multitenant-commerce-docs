import NavIcon from "@/components/nav-icons";
import { loadBusinessMeta } from "@/lib/access/business-meta";
import { BusinessClock, BusinessIdChip } from "./business-badge";
import Link from "next/link";
import { requireTenantAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { storeUrl } from "@/lib/store-url";

type RecentOrder = {
  id: string;
  order_number: string;
  status: string;
  total_minor: number;
  currency: string;
  customer_name_snapshot: string;
  created_at: string;
};

function money(minor: number, currency: string) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency.trim(),
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function metricValue(value: number | null) {
  return value === null ? "—" : value.toLocaleString("en-KE");
}

export default async function BusinessOverviewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug, { path: "" });
  if (access.denied) return access.denied;
  const { supabase, tenant, role } = access;
  const meta = await loadBusinessMeta(tenant.id);
  const canViewOrders = hasPermission(role, "orders.read");
  const canViewInventory = hasPermission(role, "inventory.read");
  const canViewReports = hasPermission(role, "reports.read");
  const canAddProducts = hasPermission(role, "products.update");
  const [productsResult, publishedResult, openOrdersResult, fulfilledResult, recentOrdersResult] =
    await Promise.all([
      supabase.from("products")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .neq("status", "archived"),
      supabase.from("products")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "published"),
      canViewOrders
        ? supabase.from("orders").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id).in("status", ["pending", "confirmed"])
        : Promise.resolve({ data: null, count: null, error: null }),
      canViewOrders
        ? supabase.from("orders").select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id).eq("status", "fulfilled")
        : Promise.resolve({ data: null, count: null, error: null }),
      canViewOrders
        ? supabase.from("orders")
            .select("id, order_number, status, total_minor, currency, customer_name_snapshot, created_at")
            .eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(6)
        : Promise.resolve({ data: null, count: null, error: null }),
    ]);

  const queryErrors = [
    productsResult.error, publishedResult.error, openOrdersResult.error,
    fulfilledResult.error, recentOrdersResult.error,
  ].filter(Boolean);
  const recentOrders = (recentOrdersResult.data ?? []) as RecentOrder[];
  const overviewFocus = canAddProducts
    ? { href: "products", title: "Keep your catalogue ready", description: "Review products and categories before sharing your storefront with customers.", action: "Open products" }
    : canViewInventory
      ? { href: "inventory", title: "Keep stock up to date", description: "Check current quantities and record stock movements for your active locations.", action: "Open inventory" }
      : canViewReports
        ? { href: "reports", title: "Review business performance", description: "See recorded sales, expense and stock activity for this workspace.", action: "Open reports" }
        : null;

  return (
    <main className="dashboard-page business-overview">
      <header className="overview-heading overview-hero">
        <div className="overview-hero-main">
          <p className="eyebrow">Business overview</p>
          <h1>{tenant.name}</h1>
          <div className="overview-hero-meta">
            {meta.businessCode ? <BusinessIdChip code={meta.businessCode} className="biz-id-hero" /> : null}
            <BusinessClock timezone={meta.timezone} className="biz-clock-hero" />
          </div>
        </div>
        <div className="overview-hero-actions">
          {canAddProducts && <Link className="hero-btn hero-btn-amber" href={`/dashboard/${tenant.slug}/products#add-product`}><NavIcon name="plus" size={16} /><span>Add product</span></Link>}
          {canAddProducts && <Link className="hero-btn hero-btn-amber" href={`/dashboard/${tenant.slug}/products/import`}><NavIcon name="/products" size={16} /><span>Import products</span></Link>}
          <a className="hero-btn hero-btn-ghost" href={storeUrl(tenant.slug)} target="_blank" rel="noreferrer"><NavIcon name="storefront" size={16} /><span>View storefront</span></a>
        </div>
      </header>

      {queryErrors.length > 0 && (
        <p className="dashboard-alert" role="alert">
          Some live workspace data could not be loaded. Refresh the page, and check your Supabase permissions if the issue continues.
        </p>
      )}

      <section className="overview-metrics" aria-label="Business summary">
        <article className="overview-metric">
          <span>Active products</span>
          <strong>{metricValue(productsResult.error ? null : productsResult.count)}</strong>
          <small>Draft and published items</small>
        </article>
        <article className="overview-metric">
          <span>Published products</span>
          <strong>{metricValue(publishedResult.error ? null : publishedResult.count)}</strong>
          <small>Visible in your storefront</small>
        </article>
        {canViewOrders && <>
          <article className="overview-metric overview-metric-attention">
            <span>Orders to review</span>
            <strong>{metricValue(openOrdersResult.error ? null : openOrdersResult.count)}</strong>
            <small>Pending or confirmed</small>
          </article>
          <article className="overview-metric">
            <span>Fulfilled orders</span>
            <strong>{metricValue(fulfilledResult.error ? null : fulfilledResult.count)}</strong>
            <small>Recorded as fulfilled</small>
          </article>
        </>}
      </section>

      <section className="overview-grid">
        {canViewOrders ? <article className="overview-panel overview-orders">
          <header className="overview-panel-heading">
            <div><p className="eyebrow">Recent activity</p><h2>Latest orders</h2></div>
            <Link href={`/dashboard/${tenant.slug}/orders`}>All orders <span aria-hidden="true">→</span></Link>
          </header>
          {recentOrdersResult.error ? (
            <p className="overview-empty">Recent orders could not be loaded.</p>
          ) : recentOrders.length === 0 ? (
            <div className="overview-empty">
              <strong>No orders yet</strong>
              <p>Orders placed through your published storefront will appear here.</p>
              {canAddProducts && <Link href={`/dashboard/${tenant.slug}/products`}>Review your catalogue <span aria-hidden="true">→</span></Link>}
            </div>
          ) : (
            <div className="overview-order-list">
              {recentOrders.map((order) => (
                <article className="overview-order-row" key={order.id}>
                  <div className="overview-order-main">
                    <strong>#{order.order_number}</strong>
                    <span>{order.customer_name_snapshot || "Store customer"}</span>
                  </div>
                  <div className="overview-order-status">
                    <span className={`order-status-pill status-${order.status}`}>{order.status.replaceAll("_", " ")}</span>
                    <small>{formatDate(order.created_at)}</small>
                  </div>
                  <strong className="overview-order-total">{money(order.total_minor, order.currency)}</strong>
                </article>
              ))}
            </div>
          )}
        </article> : (
          <article className="overview-panel overview-role-note">
            <p className="eyebrow">Your workspace</p>
            <h2>{overviewFocus?.title ?? "Workspace access"}</h2>
            <p>{overviewFocus?.description ?? "Your current role does not have a dedicated workspace section."}</p>
            {overviewFocus && <Link href={`/dashboard/${tenant.slug}/${overviewFocus.href}`}>{overviewFocus.action} <span aria-hidden="true">→</span></Link>}
          </article>
        )}

        <aside className="overview-panel overview-actions">
          <p className="eyebrow">Quick access</p>
          <h2>Keep work moving</h2>

          <div className="overview-action-list">
            {canAddProducts && <Link href={`/dashboard/${tenant.slug}/products`}><span><strong>Products</strong><small>Update your catalogue and pricing</small></span><span aria-hidden="true">→</span></Link>}
            {canViewInventory && <Link href={`/dashboard/${tenant.slug}/inventory`}><span><strong>Inventory</strong><small>Review stock by location</small></span><span aria-hidden="true">→</span></Link>}
            {canViewOrders && <Link href={`/dashboard/${tenant.slug}/orders`}><span><strong>Orders</strong><small>Review fulfilment progress</small></span><span aria-hidden="true">→</span></Link>}
            {canViewReports && <Link href={`/dashboard/${tenant.slug}/reports`}><span><strong>Reports</strong><small>See recorded business activity</small></span><span aria-hidden="true">→</span></Link>}
          </div>
          <p className="overview-currency">Workspace currency <strong>{tenant.currency}</strong></p>
        </aside>
      </section>
    </main>
  );
}
