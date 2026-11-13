"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState digest={error.digest} reset={reset} eyebrow="Your businesses" />;
}
