import { notFound, redirect } from "next/navigation";
import { getTenantAccess } from "@/lib/tenant-access";
import { hasTenantPermission } from "@/lib/tenant-permissions";
import RoleAccessDenied from "../role-access-denied";

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

      <section className="dashboard-panel" aria-labelledby="payment-readiness-title">
        <div className="dashboard-panel-header">
          <div>
            <h2 id="payment-readiness-title">Payment setup</h2>
            <p>Online payment collection is not enabled for this store yet.</p>
          </div>
          <span className="status-badge status-pending">Setup required</span>
        </div>
        <p>Orders can currently be submitted as order requests. Do not ask customers to treat an order confirmation as proof of payment.</p>
      </section>

      <section className="dashboard-panel" aria-labelledby="providers-title">
        <div className="dashboard-panel-header">
          <div>
            <h2 id="providers-title">Available provider integrations</h2>
            <p>Provider connection controls will become available after secure credential storage and server-side callback verification are deployed.</p>
          </div>
        </div>
        <div className="settings-provider-list">
          <article className="settings-provider-row">
            <div>
              <h3>M-PESA Daraja</h3>
              <p>STK Push and supported C2B flows, subject to Safaricom product approval and merchant credentials.</p>
            </div>
            <span className="status-badge status-pending">Not connected</span>
          </article>
          <article className="settings-provider-row">
            <div>
              <h3>PayHero</h3>
              <p>Hosted/provider-supported payment channels, subject to merchant onboarding and the provider's API capabilities.</p>
            </div>
            <span className="status-badge status-pending">Not connected</span>
          </article>
        </div>
      </section>

      <section className="dashboard-panel">
        <h2>Security before activation</h2>
        <ul>
          <li>Credentials must be encrypted and remain server-side.</li>
          <li>Each provider callback must be authenticated, validated and deduplicated.</li>
          <li>Payment amounts, currency and order ownership must be checked against the database.</li>
          <li>Provider timeouts and delayed callbacks must be reconciled before an order is marked paid.</li>
        </ul>
      </section>
    </main>
  );
}
