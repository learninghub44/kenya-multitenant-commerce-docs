import { requireTenantAccess } from "@/lib/access";
import { failLoad } from "@/lib/access/load-failure";
import { hasPermission } from "@/lib/permissions";
import OrdersBoard, { type BoardOrder } from "./orders-board";
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

  const fmt = (currency: string, minor: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency }).format(minor / 100);
  const board: BoardOrder[] = orders.map(order => ({
    id: order.id, order_number: order.order_number, status: order.status, payment_status: order.payment_status,
    customer_name_snapshot: order.customer_name_snapshot, customer_phone_snapshot: order.customer_phone_snapshot,
    delivery_address_snapshot: order.delivery_address_snapshot, notes: order.notes ?? "",
    totalLabel: fmt(order.currency, order.total_minor),
    placedLabel: new Date(order.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" }),
    items: items.filter(item => item.order_id === order.id).map(item => ({
      id: item.id, product_title_snapshot: item.product_title_snapshot, variant_title_snapshot: item.variant_title_snapshot,
      sku_snapshot: item.sku_snapshot, quantity: item.quantity,
      unitLabel: fmt(order.currency, item.unit_price_minor), lineLabel: fmt(order.currency, item.line_total_minor)
    }))
  }));

  return <main className="dashboard-page">
    <DashboardPageHeader eyebrow="Sales & fulfilment" title="Orders" description={`Orders for ${tenant.name}. Online payment integration is not enabled; staff can record a payment only after independently verifying receipt.`} aside={<span className="workspace-status">{orders.length} recent orders</span>} />
    {orders.length === 0
      ? <DashboardEmptyState title="No orders yet" description="Customer order requests from the public storefront will appear here." />
      : <OrdersBoard tenantId={tenant.id} orders={board} canRecordPayment={canRecordPayment} canManageOrders={canManageOrders} />}
  </main>;
}
