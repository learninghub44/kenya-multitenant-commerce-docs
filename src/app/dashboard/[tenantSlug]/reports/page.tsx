import { requireTenantAccess } from "@/lib/access";
import { failLoad } from "@/lib/access/load-failure";
import Link from "next/link";
import { hasPermission } from "@/lib/permissions";
import { RANGES, bucketSales, nairobiDayKey, parseRange, rangeStartKey } from "@/lib/report-periods";
import styles from "./reports.module.css";

type Order = { id: string; status: string; payment_status: string; total_minor: number; created_at: string };
type Expense = { id: string; description: string; category: string; amount_minor: number; expense_date: string };
type Balance = { variant_id: string; on_hand: number; reserved: number };
type Variant = { id: string; product_id: string; title: string; sku: string | null };
type Product = { id: string; title: string; track_inventory: boolean };

function money(value: number) {
  return new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",maximumFractionDigits:2}).format(value/100);
}

const ROW_LIMIT = 1000;

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ tenantSlug: string }>; searchParams: Promise<{ range?: string | string[] }> }) {
  const { tenantSlug } = await params;
  const range = parseRange((await searchParams).range);
  const access = await requireTenantAccess(tenantSlug, { permission: "reports.read", area: "reports", path: "/reports" });
  if (access.denied) return access.denied;
  const { supabase, tenant, role } = access;

  const [orderResult,expenseResult,variantResult,productResult,balanceResult] = await Promise.all([
    supabase.from("orders").select("id,status,payment_status,total_minor,created_at").eq("tenant_id",tenant.id).order("created_at",{ascending:false}).limit(ROW_LIMIT),
    hasPermission(role, "reports.read")
      ? supabase.from("expenses").select("id,description,category,amount_minor,expense_date").eq("tenant_id",tenant.id).order("expense_date",{ascending:false}).limit(ROW_LIMIT)
      : Promise.resolve({data:[],error:null}),
    supabase.from("product_variants").select("id,product_id,title,sku").eq("tenant_id",tenant.id).neq("status","archived"),
    supabase.from("products").select("id,title,track_inventory").eq("tenant_id",tenant.id).neq("status","archived"),
    supabase.from("inventory_balances").select("variant_id,on_hand,reserved").eq("tenant_id",tenant.id)
  ]);
  if (orderResult.error || expenseResult.error || variantResult.error || productResult.error || balanceResult.error) failLoad("reports #1", orderResult.error ?? expenseResult.error ?? variantResult.error ?? productResult.error ?? balanceResult.error);
  const now=new Date();
  const startKey=rangeStartKey(range,now);
  const allOrders=(orderResult.data??[]) as Order[];
  const orders=startKey ? allOrders.filter(order=>nairobiDayKey(order.created_at)>=startKey) : allOrders;
  const expenses=((expenseResult.data??[]) as Expense[]).filter(expense=>!startKey || expense.expense_date>=startKey);
  const truncated=allOrders.length>=ROW_LIMIT;
  const variants=(variantResult.data??[]) as Variant[];
  const products=(productResult.data??[]) as Product[];
  const balances=(balanceResult.data??[]) as Balance[];
  const paidOrders=orders.filter(order=>order.payment_status==="succeeded" && !["cancelled"].includes(order.status));
  const paidSales=paidOrders.reduce((sum,order)=>sum+order.total_minor,0);
  const expenseTotal=expenses.reduce((sum,expense)=>sum+expense.amount_minor,0);
  const averageOrder=paidOrders.length ? Math.round(paidSales/paidOrders.length) : 0;
  const trend=bucketSales(paidOrders,range,now);
  const peak=trend.reduce((best,point)=>point.total>best.total?point:best,trend[0]);
  const pendingOrders=allOrders.filter(order=>order.status==="pending" || order.status==="confirmed").length;
  const rangeLabel=RANGES.find(item=>item.value===range)?.label ?? "30 days";
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
    <header className="dashboard-header"><div><p className="eyebrow">Business performance</p><h1>Reports</h1><p className="auth-description">Live records from {tenant.name}. Sales figures include only orders with a recorded successful payment; this is not an accounting statement.</p></div><span className="workspace-status">{orders.length} orders · {rangeLabel.toLowerCase()}</span></header>
    <nav className={styles.periods} aria-label="Report period">
      {RANGES.map(item=><Link key={item.value} href={`?range=${item.value}`} scroll={false} className={`${styles.period} ${item.value===range ? styles.periodActive : ""}`} aria-current={item.value===range ? "true" : undefined}>{item.label}</Link>)}
    </nav>
    {truncated && <p className={styles.notice} role="note">Only the most recent {ROW_LIMIT.toLocaleString("en-KE")} orders are loaded, so older periods may be incomplete.</p>}
    <section className="report-metrics">
      <article><span>Recorded paid sales</span><strong>{money(paidSales)}</strong><small>{paidOrders.length} paid orders{paidOrders.length ? ` · avg ${money(averageOrder)}` : ""}</small></article>
      <article><span>Recorded expenses</span><strong>{money(expenseTotal)}</strong><small>{expenses.length} expense records{!hasPermission(role, "reports.read") ? " · finance access required for full totals" : ""}</small></article>
      <article><span>Orders needing attention</span><strong>{pendingOrders}</strong><small>Pending or confirmed, right now</small></article>
      <article><span>Low-stock variants</span><strong>{lowStock.length}</strong><small>At or below 5 available units</small></article>
    </section>
    <section className="workspace-list">
      <article className="workspace-card"><div><h2>Paid sales trend</h2><p>Recorded paid sales per {range==="7d"||range==="30d" ? "day" : "month"}, {rangeLabel.toLowerCase()}.</p></div>
        {paidSales===0 ? <p>No recorded paid sales in this period.</p> : <>
          <div className={styles.chart} role="img" aria-label={`Paid sales per ${range==="7d"||range==="30d" ? "day" : "month"}. Highest: ${peak.label}, ${money(peak.total)}.`}>
            {trend.map(point=><span key={point.key} className={styles.bar} title={`${point.label}: ${money(point.total)}`}><i style={{height:`${peak.total ? Math.max(point.total ? 4 : 0,Math.round(point.total/peak.total*100)) : 0}%`}} /></span>)}
          </div>
          <div className={styles.axis}><span>{trend[0].label}</span><span>Highest: {peak.label} · {money(peak.total)}</span><span>{trend[trend.length-1].label}</span></div>
        </>}
      </article>
      <article className="workspace-card"><div><h2>Order status breakdown</h2><p>Orders placed in the selected period.</p></div><div className="report-status-list">{["pending","confirmed","processing","ready_for_fulfilment","fulfilled","cancelled"].map(status=><div key={status}><span>{status.replaceAll("_"," ")}</span><strong>{orders.filter(order=>order.status===status).length}</strong></div>)}</div></article>
      <article className="workspace-card"><div><h2>Low-stock watchlist</h2><p>Available quantity is on-hand stock minus reservations across active locations.</p></div>
        {lowStock.length===0 ? <p>No tracked variants are currently at or below five available units.</p> : <div className="report-status-list">{lowStock.slice(0,30).map(item=><div key={item.variant.id}><span>{item.product.title} — {item.variant.title}{item.variant.sku ? ` · ${item.variant.sku}` : ""}<small>{item.onHand} on hand · {item.reserved} reserved</small></span><strong>{item.available} available</strong></div>)}</div>}
      </article>
      {hasPermission(role, "reports.read") && <article className="workspace-card"><div><h2>Recent expenses</h2><p>Expenses recorded in the selected period.</p></div>
        {expenses.length===0 ? <p>No expense records in this period.</p> : <div className="report-status-list">{expenses.slice(0,20).map(expense=><div key={expense.id}><span>{expense.description}<small>{expense.category} · {expense.expense_date}</small></span><strong>{money(expense.amount_minor)}</strong></div>)}</div>}
      </article>}
    </section>
  </main>;
}
