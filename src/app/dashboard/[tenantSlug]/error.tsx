"use client";

export default function TenantDashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="dashboard-page" role="alert">
      <p className="eyebrow">Business workspace</p>
      <h1>We could not load this page</h1>
      <p className="auth-description">
        Your workspace data may be temporarily unavailable. Try again. Your business records have not been changed by this error.
      </p>
      <button className="workspace-action" type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
