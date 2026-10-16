import Link from "next/link";

export default function RoleAccessDenied({
  tenantSlug,
  role,
  area,
}: {
  tenantSlug: string;
  role: string;
  area: string;
}) {
  return (
    <main className="dashboard-page access-denied-page">
      <section className="access-denied-card">
        <p className="eyebrow">Workspace access</p>
        <h1>Access not included</h1>
        <p>
          Your <strong>{role.replaceAll("_", " ")}</strong> role does not include access to {area}.
          If you need access, ask a workspace owner or manager.
        </p>
        <Link className="workspace-action" href={`/dashboard/${tenantSlug}`}>
          Return to business overview <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}
