import { requireTenantAccess } from "@/lib/access";
import { failLoad } from "@/lib/access/load-failure";
import ErpManager from "./erp-manager";

export default async function ErpPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug, { permission: "erp.read", area: "business records", path: "/erp" });
  if (access.denied) return access.denied;
  const { supabase, tenant, role } = access;

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
  const firstError = [customerResult,supplierResult,expenseResult,poResult,poItemResult,variantResult,productResult,locationResult].map(result=>result.error).find(Boolean);
  if (firstError) failLoad("business records", firstError);

  return <main className="dashboard-page">
    <header className="dashboard-header"><div><p className="eyebrow">Business operations</p><h1>ERP workspace</h1><p className="auth-description">Customers, suppliers, purchasing, goods receipts and expense records for {tenant.name}.</p></div><span className="workspace-status">{role.replaceAll("_"," ")}</span></header>
    <ErpManager tenantId={tenant.id} role={role}
      customers={customerResult.data ?? []} suppliers={supplierResult.data ?? []} expenses={expenseResult.data ?? []}
      purchaseOrders={poResult.data ?? []} purchaseItems={poItemResult.data ?? []} variants={variantResult.data ?? []}
      products={productResult.data ?? []} locations={locationResult.data ?? []} />
  </main>;
}
