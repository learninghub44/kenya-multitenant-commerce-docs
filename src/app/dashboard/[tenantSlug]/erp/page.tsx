import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ErpManager from "./erp-manager";

export default async function ErpPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth?next=/dashboard");
  const { data: tenant, error: tenantError } = await supabase.from("tenants")
    .select("id,name,slug,status").eq("slug",tenantSlug).maybeSingle();
  if (tenantError || !tenant || tenant.status!=="active") notFound();
  const { data: membership } = await supabase.from("tenant_memberships")
    .select("role").eq("tenant_id",tenant.id).eq("user_id",user.id).eq("active",true).maybeSingle();
  if (!membership) notFound();

  const [customerResult,supplierResult,expenseResult,poResult,poItemResult,variantResult,productResult,locationResult] = await Promise.all([
    supabase.from("customers").select("id,display_name,phone,email").eq("tenant_id",tenant.id).order("display_name").limit(100),
    supabase.from("suppliers").select("id,name,phone,email,active").eq("tenant_id",tenant.id).order("name").limit(100),
    supabase.from("expenses").select("id,description,category,amount_minor,expense_date,reference").eq("tenant_id",tenant.id).order("expense_date",{ascending:false}).limit(100),
    supabase.from("purchase_orders").select("id,reference,supplier_id,status,created_at").eq("tenant_id",tenant.id).order("created_at",{ascending:false}).limit(100),
    supabase.from("purchase_order_items").select("id,purchase_order_id,variant_id,quantity_ordered,quantity_received,unit_cost_minor").eq("tenant_id",tenant.id),
    supabase.from("product_variants").select("id,product_id,title,sku,status").eq("tenant_id",tenant.id).order("title"),
    supabase.from("products").select("id,title").eq("tenant_id",tenant.id).order("title"),
    supabase.from("inventory_locations").select("id,name,code").eq("tenant_id",tenant.id).eq("active",true).order("name")
  ]);
  const failed = [customerResult,supplierResult,expenseResult,poResult,poItemResult,variantResult,productResult,locationResult].some(result=>result.error);
  if (failed) return <main className="dashboard-page"><Link href="/dashboard">← Your businesses</Link><p role="alert">Could not load the ERP workspace. Confirm migrations 008 and 016 are applied, then check the database permissions.</p></main>;

  return <main className="dashboard-page">
    <p><Link href="/dashboard">← Your businesses</Link> · <Link href={`/dashboard/${tenant.slug}/products`}>Products</Link> · <Link href={`/dashboard/${tenant.slug}/inventory`}>Inventory</Link> · <Link href={`/dashboard/${tenant.slug}/orders`}>Orders</Link></p>
    <header className="dashboard-header"><div><p className="eyebrow">BUSINESS OPERATIONS</p><h1>ERP workspace</h1><p className="auth-description">Customers, suppliers, purchasing, goods receipts and expense records for {tenant.name}.</p></div><span className="workspace-status">{membership.role.replaceAll("_"," ")}</span></header>
    <ErpManager tenantId={tenant.id} role={membership.role}
      customers={customerResult.data ?? []} suppliers={supplierResult.data ?? []} expenses={expenseResult.data ?? []}
      purchaseOrders={poResult.data ?? []} purchaseItems={poItemResult.data ?? []} variants={variantResult.data ?? []}
      products={productResult.data ?? []} locations={locationResult.data ?? []} />
  </main>;
}
