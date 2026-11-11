import { notFound, redirect } from "next/navigation";
import { getTenantAccess } from "@/lib/tenant-access";
import { hasTenantPermission } from "@/lib/tenant-permissions";
import RoleAccessDenied from "../role-access-denied";
import PaymentConnections from "./payment-connections";

export default async function PaymentsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await getTenantAccess(tenantSlug);
  if (access.reason === "unauthenticated") {
    redirect(`/login?next=${encodeURIComponent(`/dashboard/${tenantSlug}/payments`)}`);
  }
  if (access.reason === "tenant_error") throw new Error("Could not verify this business workspace.");
  if (access.reason === "membership_error") throw new Error("Could not verify your business access.");
  if (!access.tenant || !access.membership || !access.user) notFound();
  if (!hasTenantPermission(access.membership.role, "settingsManage")) {
    return <RoleAccessDenied tenantSlug={tenantSlug} role={access.membership.role} area="payment integrations" />;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Business settings</p>
          <h1>Payments &amp; integrations</h1>
          <p className="auth-description">Manage the payment providers your store will use to collect customer payments.</p>
        </div>
      </header>

      <PaymentConnections tenantSlug={tenantSlug} />
    </main>
  );
}
