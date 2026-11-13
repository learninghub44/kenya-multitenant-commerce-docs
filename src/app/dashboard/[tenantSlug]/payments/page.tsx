import { requireTenantAccess } from "@/lib/access";
import PaymentConnections from "./payment-connections";

export default async function PaymentsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const access = await requireTenantAccess(tenantSlug, { permission: "settings.payments.manage", area: "payment integrations", path: "/payments" });
  if (access.denied) return access.denied;

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
