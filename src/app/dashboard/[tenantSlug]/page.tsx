import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect(`/auth?next=${encodeURIComponent(`/dashboard/${tenantSlug}`)}`);
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, slug, status, currency")
    .eq("slug", tenantSlug)
    .maybeSingle();
  if (tenantError) throw new Error("Could not load this business workspace.");
  if (!tenant || tenant.status !== "active") notFound();

  const { data: membership, error: membershipError } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (membershipError) throw new Error("Could not verify your business access.");
  if (!membership) notFound();

  const canViewOrders = ["owner", "manager", "order_operator"].includes(membership.role);
  const canViewInventory = ["owner", "manager", "stock_clerk"].includes(membership.role);
  const canViewReports = ["owner", "manager", "finance_viewer"].includes(membership.role);
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
        ? supabase.from("orders")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id)
            .in("status", ["pending", "confirmed"])
        : Promise.resolve({ data: null, count: null, error: null }),
      canViewOrders
        ? supabase.from("orders")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenant.id)
            .eq("status", "fulfilled")
        : Promise.resolve({ data: null, count: null, error: null }),
      canViewOrders
        ? supabase.from("orders")
            .select("id, order_number, status, total_minor, currency, customer_name_snapshot, created_at")
            .eq("tenant_id", tenant.id)
            .order("created_at", { ascending: false })
            .limit(6)
        : Promise.resolve({ data: null, count: null, error: null }),
    ]);

  const queryErrors = [
    productsResult.error,
    publishedResult.error,
    openOrdersResult.error,
    fulfilledResult.error,
    recentOrdersResult.error,
  ].filter(Boolean);
  const recentOrders = (recentOrdersResult.data ?? []) as RecentOrder[];
  const canAddProducts = ["owner", "manager", "catalog_editor"].includes(membership.role);
  const overviewFocus = canAddProducts
    ? { href: "products", title: "Keep your catalogue ready", description: "Review products and categories before sharing your storefront with customers.", action: "Open products" }
    : canViewInventory
      ? { href: "inventory", title: "Keep stock up to date", description: "Check current quantities and record stock movements for your active locations.", action: "Open inventory" }
      : canViewReports
        ? { href: "reports", title: "Review business performance", description: "See recorded sales, expense and stock activity for this workspace.", action: "Open reports" }
        : null;

  return (
    <main className="dashboard-page business-overview">
      <header className="overview-heading">
        <div>
          <p className="eyebrow">BUSINESS OVERVIEW</p>
          <h1>{tenant.name}</h1>
          <p className="auth-description">
            Your live workspace snapshot. Start with the work that needs your attention.
          </p>
        </div>
        <Link className="overview-store-link" href={`/store/${tenant.slug}`} target="_blank" rel="noreferrer">
          View storefront <span aria-hidden="true">↗</span>
        </Link>
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
        {canViewOrders && (
          <>
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
          </>
        )}
      </section>

      <section className="overview-grid">
        {canViewOrders ? <article className="overview-panel overview-orders">
          <header className="overview-panel-heading">
            <div>
              <p className="eyebrow">RECENT ACTIVITY</p>
              <h2>Latest orders</h2>
            </div>
            <Link href={`/dashboard/${tenant.slug}/orders`}>All orders <span aria-hidden="true">→</span></Link>
          </header>

          {recentOrdersResult.error ? (
            <p className="overview-empty">Recent orders could not be loaded.</p>
          ) : recentOrders.length === 0 ? (
            <div className="overview-empty">
              <strong>No orders yet</strong>
              <p>Orders placed through your published storefront will appear here.</p>
              {canAddProducts && (
                <Link href={`/dashboard/${tenant.slug}/products`}>Review your catalogue <span aria-hidden="true">→</span></Link>
              )}
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
                    <span className={`order-status-pill status-${order.status}`}>
                      {order.status.replaceAll("_", " ")}
                    </span>
                    <small>{formatDate(order.created_at)}</small>
                  </div>
                  <strong className="overview-order-total">{money(order.total_minor, order.currency)}</strong>
                </article>
              ))}
            </div>
          )}
        </article> : (
          <article className="overview-panel overview-role-note">
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h2>{overviewFocus?.title ?? "Workspace access"}</h2>
            <p>{overviewFocus?.description ?? "Your current role does not have a dedicated workspace section."}</p>
            {overviewFocus && (
              <Link href={`/dashboard/${tenant.slug}/${overviewFocus.href}`}>
                {overviewFocus.action} <span aria-hidden="true">→</span>
              </Link>
            )}
          </article>
        )}

        <aside className="overview-panel overview-actions">
          <p className="eyebrow">QUICK ACCESS</p>
          <h2>Keep work moving</h2>
          <p className="overview-actions-copy">Go straight to the areas your team uses most.</p>
          <div className="overview-action-list">
            {canAddProducts && (
              <Link href={`/dashboard/${tenant.slug}/products`}>
                <span><strong>Products</strong><small>Update your catalogue and pricing</small></span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
            {canViewInventory && (
              <Link href={`/dashboard/${tenant.slug}/inventory`}>
                <span><strong>Inventory</strong><small>Review stock by location</small></span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
            {canViewOrders && (
              <Link href={`/dashboard/${tenant.slug}/orders`}>
                <span><strong>Orders</strong><small>Review fulfilment progress</small></span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
            {canViewReports && (
              <Link href={`/dashboard/${tenant.slug}/reports`}>
                <span><strong>Reports</strong><small>See recorded business activity</small></span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
          <p className="overview-currency">Workspace currency <strong>{tenant.currency}</strong></p>
        </aside>
      </section>
    </main>
  );
}
