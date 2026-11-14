// Backwards-compatible wrappers. New code should import from "@/components/ui".
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export function DashboardPageHeader(props: { eyebrow: string; title: string; description?: string; aside?: ReactNode }) {
  return <PageHeader {...props} />;
}

export function DashboardEmptyState(props: { title: string; description: string; children?: ReactNode }) {
  return <EmptyState {...props} />;
}

export function DashboardNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  return tone === "error"
    ? <p className="dashboard-alert" role="alert">{children}</p>
    : <Alert>{children}</Alert>;
}
