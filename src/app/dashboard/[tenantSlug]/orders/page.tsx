import { requireTenantAccess } from "@/lib/access";
import { failLoad } from "@/lib/access/load-failure";
import { hasPermission } from "@/lib/permissions";
import OrderActions from "./order-actions";
import { DashboardEmptyState, DashboardPageHeader } from "@/components/dashboard-primitives";

type OrderRow = {
  id: string; order_number: string; status: string; payment_status: string;
  total_minor: number; currency: string; customer_name_snapshot: string;
  customer_phone_snapshot: string; delivery_address_snapshot: string;
  created_at: string; notes: string;
};
type ItemRow = {
  id: string; order_id: string; product_title_snapshot: string;
  variant_title_snapshot: string; sku_snapshot: string | null;
  quantity: number; unit_price_minor: number; line_total_minor: number;
};

export default async function OrdersPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug, { permission: "orders.update", area: "orders", path: "/orders" });
  if (access.denied) return access.denied;
  const { supabase, tenant, role } = access;

  const { data: orderData, error: orderError } = await supabase.from("orders")
    .select("id,order_number,status,payment_status,total_minor,currency,customer_name_snapshot,customer_phone_snapshot,delivery_address_snapshot,created_at,notes")
    .eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(100);
  if (orderError) failLoad("orders #1", orderError);
  const orders = (orderData ?? []) as OrderRow[];
  const { data: itemData, error: itemError } = orders.length
    ? await supabase.from("order_items").select("id,order_id,product_title_snapshot,variant_title_snapshot,sku_snapshot,quantity,unit_price_minor,line_total_minor")
      .eq("tenant_id",tenant.id).in("order_id",orders.map(order => order.id))
    : { data: [], error: null };
  if (itemError) failLoad("orders #2", itemError);
  const items = (itemData ?? []) as ItemRow[];
  const canRecordPayment = hasPermission(role, "payments.record");
  const canManageOrders = hasPermission(role, "orders.update");

  return <main className="dashboard-page">
    <DashboardPageHeader eyebrow="Sales & fulfilment" title="Orders" description={`Orders for ${tenant.name}. Online payment integration is not enabled; staff can record a payment only after independently verifying receipt.`} aside={<span className="workspace-status">{orders.length} recent orders</span>} />
    <section className="workspace-list">
      {orders.length===0 ? <DashboardEmptyState title="No orders yet" description="Customer order requests from the public storefront will appear here." /> : orders.map(order => <article className="order-card" key={order.id}>
        <div className="order-card-header"><div><p className="eyebrow">{order.order_number}</p><h2>{order.customer_name_snapshot}</h2><p>{order.customer_phone_snapshot}</p></div><div className="order-badges"><span className="workspace-status">{order.status.replaceAll("_"," ")}</span><span className="workspace-status">{order.payment_status.replaceAll("_"," ")}</span></div></div>
        <p className="order-address">{order.delivery_address_snapshot || "No delivery address provided"}</p>
        <ul className="order-line-list">{items.filter(item => item.order_id===order.id).map(item => <li key={item.id}><span>{item.product_title_snapshot} — {item.variant_title_snapshot}{item.sku_snapshot ? ` · ${item.sku_snapshot}` : ""}<small>Qty {item.quantity} × {new Intl.NumberFormat("en-KE",{style:"currency",currency:order.currency}).format(item.unit_price_minor/100)}</small></span><strong>{new Intl.NumberFormat("en-KE",{style:"currency",currency:order.currency}).format(item.line_total_minor/100)}</strong></li>)}</ul>
        <div className="order-total"><span>Order total</span><strong>{new Intl.NumberFormat("en-KE",{style:"currency",currency:order.currency}).format(order.total_minor/100)}</strong></div>
        <p className="field-help">Placed {new Date(order.created_at).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Nairobi"})}</p>
        {(canRecordPayment || canManageOrders) && <OrderActions tenantId={tenant.id} orderId={order.id} status={order.status} paymentStatus={order.payment_status} canRecordPayment={canRecordPayment} canManageOrders={canManageOrders} />}
      </article>)}
    </section>
  </main>;
}
