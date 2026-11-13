import { Skeleton } from "@/components/ui/skeleton";

export default function TenantDashboardLoading() {
  return (
    <main className="dashboard-page" aria-busy="true" aria-live="polite">
      <p className="eyebrow">Business workspace</p>
      <h1>Loading your workspace</h1>
      <p className="auth-description">Getting the latest information for this business.</p>
      <div className="workspace-list">
        <div className="workspace-card"><Skeleton /></div>
        <div className="workspace-card"><Skeleton /></div>
      </div>
    </main>
  );
}
