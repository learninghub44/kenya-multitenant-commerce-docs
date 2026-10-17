import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import OrderActions from "./order-actions";
import RoleAccessDenied from "../role-access-denied";

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
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/auth?next=${encodeURIComponent(`/dashboard/${tenantSlug}/orders`)}`);
  const { data: tenant, error: tenantError } = await supabase.from("tenants")
    .select("id,name,slug,status").eq("slug", tenantSlug).maybeSingle();
  if (tenantError || !tenant || tenant.status !== "active") notFound();
  const { data: membership } = await supabase.from("tenant_memberships")
    .select("role").eq("tenant_id", tenant.id).eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!membership) notFound();
  if (!["owner", "manager", "order_operator"].includes(membership.role)) {
    return <RoleAccessDenied tenantSlug={tenantSlug} role={membership.role} area="orders" />;
  }

  const { data: orderData, error: orderError } = await supabase.from("orders")
    .select("id,order_number,status,payment_status,total_minor,currency,customer_name_snapshot,customer_phone_snapshot,delivery_address_snapshot,created_at,notes")
    .eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(100);
  if (orderError) {
    return <main className="dashboard-page"><Link href={`/dashboard/${tenant.slug}/products`}>← Products</Link><p role="alert">Could not load orders. Confirm the order migrations are applied.</p></main>;
  }
  const orders = (orderData ?? []) as OrderRow[];
  const { data: itemData, error: itemError } = orders.length
    ? await supabase.from("order_items").select("id,order_id,product_title_snapshot,variant_title_snapshot,sku_snapshot,quantity,unit_price_minor,line_total_minor")
      .eq("tenant_id",tenant.id).in("order_id",orders.map(order => order.id))
    : { data: [], error: null };
  if (itemError) {
    return <main className="dashboard-page"><Link href={`/dashboard/${tenant.slug}/products`}>← Products</Link><p role="alert">Could not load order items.</p></main>;
  }
  const items = (itemData ?? []) as ItemRow[];
  const canRecordPayment = ["owner","manager"].includes(membership.role);
  const canManageOrders = ["owner","manager","order_operator"].includes(membership.role);

  return <main className="dashboard-page">
    <header className="dashboard-header"><div><p className="eyebrow">Sales & fulfilment</p><h1>Orders</h1><p className="auth-description">Orders for {tenant.name}. Online payment integration is not enabled; staff can record a payment only after independently verifying receipt.</p></div><span className="workspace-status">{orders.length} recent orders</span></header>
    <section className="workspace-list">
      {orders.length===0 ? <div className="empty-state"><h2>No orders yet</h2><p>Customer order requests from the public storefront will appear here.</p></div> : orders.map(order => <article className="order-card" key={order.id}>
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
