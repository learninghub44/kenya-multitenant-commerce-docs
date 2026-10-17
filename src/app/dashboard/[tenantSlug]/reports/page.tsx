import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RoleAccessDenied from "../role-access-denied";

type Order = { id: string; status: string; payment_status: string; total_minor: number; created_at: string };
type Expense = { id: string; description: string; category: string; amount_minor: number; expense_date: string };
type Balance = { variant_id: string; on_hand: number; reserved: number };
type Variant = { id: string; product_id: string; title: string; sku: string | null };
type Product = { id: string; title: string; track_inventory: boolean };

function money(value: number) {
  return new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",maximumFractionDigits:2}).format(value/100);
}

export default async function ReportsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect(`/auth?next=${encodeURIComponent(`/dashboard/${tenantSlug}/reports`)}`);
  const { data: tenant, error: tenantError } = await supabase.from("tenants").select("id,name,slug,status").eq("slug",tenantSlug).maybeSingle();
  if (tenantError || !tenant || tenant.status!=="active") notFound();
  const { data: membership } = await supabase.from("tenant_memberships").select("role").eq("tenant_id",tenant.id).eq("user_id",user.id).eq("active",true).maybeSingle();
  if (!membership) notFound();
  if (!["owner", "manager", "finance_viewer"].includes(membership.role)) {
    return <RoleAccessDenied tenantSlug={tenantSlug} role={membership.role} area="reports" />;
  }

  const [orderResult,expenseResult,variantResult,productResult,balanceResult] = await Promise.all([
    supabase.from("orders").select("id,status,payment_status,total_minor,created_at").eq("tenant_id",tenant.id).order("created_at",{ascending:false}).limit(1000),
    ["owner","manager","finance_viewer"].includes(membership.role)
      ? supabase.from("expenses").select("id,description,category,amount_minor,expense_date").eq("tenant_id",tenant.id).order("expense_date",{ascending:false}).limit(1000)
      : Promise.resolve({data:[],error:null}),
    supabase.from("product_variants").select("id,product_id,title,sku").eq("tenant_id",tenant.id).neq("status","archived"),
    supabase.from("products").select("id,title,track_inventory").eq("tenant_id",tenant.id).neq("status","archived"),
    supabase.from("inventory_balances").select("variant_id,on_hand,reserved").eq("tenant_id",tenant.id)
  ]);
  if (orderResult.error || expenseResult.error || variantResult.error || productResult.error || balanceResult.error) {
    return <main className="dashboard-page"><Link href={`/dashboard/${tenant.slug}/products`}>← Products</Link><p role="alert">Could not load reports. Confirm all ERP migrations are applied.</p></main>;
  }
  const orders=(orderResult.data??[]) as Order[];
  const expenses=(expenseResult.data??[]) as Expense[];
  const variants=(variantResult.data??[]) as Variant[];
  const products=(productResult.data??[]) as Product[];
  const balances=(balanceResult.data??[]) as Balance[];
  const paidOrders=orders.filter(order=>order.payment_status==="succeeded" && !["cancelled"].includes(order.status));
  const paidSales=paidOrders.reduce((sum,order)=>sum+order.total_minor,0);
  const expenseTotal=expenses.reduce((sum,expense)=>sum+expense.amount_minor,0);
  const pendingOrders=orders.filter(order=>order.status==="pending" || order.status==="confirmed").length;
  const productById=new Map(products.map(product=>[product.id,product]));
  const lowStock=variants.flatMap(variant=>{
    const product=productById.get(variant.product_id);
    if(!product?.track_inventory) return [];
    const stock=balances.filter(balance=>balance.variant_id===variant.id);
    const onHand=stock.reduce((sum,balance)=>sum+balance.on_hand,0);
    const reserved=stock.reduce((sum,balance)=>sum+balance.reserved,0);
    const available=onHand-reserved;
    return available<=5 ? [{variant,product,available,onHand,reserved}] : [];
  }).sort((a,b)=>a.available-b.available);

  return <main className="dashboard-page">
    <header className="dashboard-header"><div><p className="eyebrow">Business performance</p><h1>Reports</h1><p className="auth-description">Live records from {tenant.name}. Sales figures include only orders with a recorded successful payment; this is not an accounting statement.</p></div><span className="workspace-status">Last {orders.length} orders</span></header>
    <section className="report-metrics">
      <article><span>Recorded paid sales</span><strong>{money(paidSales)}</strong><small>{paidOrders.length} paid orders</small></article>
      <article><span>Recorded expenses</span><strong>{money(expenseTotal)}</strong><small>{expenses.length} expense records{!["owner","manager","finance_viewer"].includes(membership.role) ? " · finance access required for full totals" : ""}</small></article>
      <article><span>Orders needing attention</span><strong>{pendingOrders}</strong><small>Pending or confirmed</small></article>
      <article><span>Low-stock variants</span><strong>{lowStock.length}</strong><small>At or below 5 available units</small></article>
    </section>
    <section className="workspace-list">
      <article className="workspace-card"><div><h2>Order status breakdown</h2><p>Based on the most recent 1,000 orders available to this workspace.</p></div><div className="report-status-list">{["pending","confirmed","processing","ready_for_fulfilment","fulfilled","cancelled"].map(status=><div key={status}><span>{status.replaceAll("_"," ")}</span><strong>{orders.filter(order=>order.status===status).length}</strong></div>)}</div></article>
      <article className="workspace-card"><div><h2>Low-stock watchlist</h2><p>Available quantity is on-hand stock minus reservations across active locations.</p></div>
        {lowStock.length===0 ? <p>No tracked variants are currently at or below five available units.</p> : <div className="report-status-list">{lowStock.slice(0,30).map(item=><div key={item.variant.id}><span>{item.product.title} — {item.variant.title}{item.variant.sku ? ` · ${item.variant.sku}` : ""}<small>{item.onHand} on hand · {item.reserved} reserved</small></span><strong>{item.available} available</strong></div>)}</div>}
      </article>
      {["owner","manager","finance_viewer"].includes(membership.role) && <article className="workspace-card"><div><h2>Recent expenses</h2><p>Latest 1,000 recorded expense rows.</p></div>
        {expenses.length===0 ? <p>No expense records yet.</p> : <div className="report-status-list">{expenses.slice(0,20).map(expense=><div key={expense.id}><span>{expense.description}<small>{expense.category} · {expense.expense_date}</small></span><strong>{money(expense.amount_minor)}</strong></div>)}</div>}
      </article>}
    </section>
  </main>;
}
