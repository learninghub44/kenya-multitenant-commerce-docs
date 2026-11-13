import Link from "next/link";

export default function WorkspaceUnavailable({ name, status }: { name: string; status: string }) {
  const closed = status === "closed";
  return (
    <main className="dashboard-page access-denied-page">
      <section className="access-denied-card" role="alert">
        <p className="eyebrow">Workspace unavailable</p>
        <h1>{name} is {closed ? "closed" : "currently unavailable"}</h1>
        <p>
          {closed
            ? "This business workspace has been closed, so its dashboard and storefront are not available."
            : "This business workspace has been paused, so its dashboard and storefront are not available right now."}
          {" "}Your records have not been deleted. If you think this is a mistake, contact support.
        </p>
        <Link className="workspace-action" href="/dashboard">
          Back to your businesses <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}
