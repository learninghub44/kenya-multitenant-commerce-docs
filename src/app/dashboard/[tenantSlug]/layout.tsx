import { requireTenantAccess } from "@/lib/access";
import { loadBusinessMeta } from "@/lib/access/business-meta";
import TenantShell from "./tenant-shell";

export default async function TenantDashboardLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}>) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug);
  // Suspended/closed workspaces render the "workspace unavailable" page with no
  // dashboard chrome; pages under this layout use the same cached lookup.
  if (access.denied) return access.denied;

  const meta = await loadBusinessMeta(access.tenant.id);

  return (
    <TenantShell
      tenantSlug={access.tenant.slug}
      tenantName={access.tenant.name}
      role={access.role}
      email={access.user.email ?? null}
      businessCode={meta.businessCode}
    >
      {children}
    </TenantShell>
  );
}
