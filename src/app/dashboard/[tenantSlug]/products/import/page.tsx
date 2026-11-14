import Link from "next/link";
import { requireTenantAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";
import { DashboardPageHeader } from "@/components/dashboard-primitives";
import ImportWizard from "./import-wizard";

export default async function ImportCataloguePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug, { permission: "products.update", area: "catalogue import", path: "/products/import" });
  if (access.denied) return access.denied;
  const { tenant, role } = access;
  return (
    <main className="dashboard-page">
      <DashboardPageHeader eyebrow="Product catalogue" title="Import catalogue" aside={<Link className="workspace-action" href={`/dashboard/${tenant.slug}/products`}>← Back to products</Link>} />
      <ImportWizard tenantId={tenant.id} tenantSlug={tenant.slug} canStock={hasPermission(role, "inventory.adjust")} />
    </main>
  );
}
