import { notFound, redirect } from "next/navigation";
import { getTenantAccess } from "@/lib/tenant-access";
import TenantShell from "./tenant-shell";

export default async function TenantDashboardLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}>) {
  const { tenantSlug } = await params;
  const access = await getTenantAccess(tenantSlug);

  if (access.reason === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/${tenantSlug}`)}`);
  }
  if (access.reason === "tenant_error") {
    throw new Error("Could not verify this business workspace.");
  }
  if (access.reason === "membership_error") {
    throw new Error("Could not verify your business access.");
  }
  if (!access.tenant || !access.membership || !access.user) notFound();

  return (
    <TenantShell
      tenantSlug={access.tenant.slug}
      tenantName={access.tenant.name}
      role={access.membership.role}
      email={access.user.email ?? null}
    >
      {children}
    </TenantShell>
  );
}
