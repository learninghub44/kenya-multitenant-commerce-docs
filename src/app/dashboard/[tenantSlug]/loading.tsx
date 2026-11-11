export default function TenantDashboardLoading() {
  return (
    <main className="dashboard-page" aria-busy="true" aria-live="polite">
      <p className="eyebrow">Business workspace</p>
      <h1>Loading your workspace</h1>
      <p className="auth-description">Getting the latest information for this business.</p>
      <div className="workspace-list" aria-hidden="true">
        <div className="workspace-card"><span className="loading-skeleton" /></div>
        <div className="workspace-card"><span className="loading-skeleton" /></div>
      </div>
    </main>
  );
}
