"use client";

import { Button } from "./button";
import { ButtonLink } from "./button";

/**
 * Shared error-boundary body. `digest` is the Next.js server error digest; it
 * matches the entry in server logs, so support can find the real cause without
 * the user ever seeing schema or database details.
 */
export function ErrorState({ digest, reset }: { digest?: string; reset: () => void; eyebrow?: string }) {
  return (
    <main className="dashboard-page error-state" role="alert">
      <h1>We could not load this page</h1>
      <p className="auth-description">Try again in a moment. Nothing in your business was changed.{digest ? <> Request ID <code>{digest}</code>.</> : null}</p>
      <div className="error-state-actions">
        <Button variant="primary" onClick={() => reset()}>Try again</Button>
        <ButtonLink href="/dashboard">Your businesses</ButtonLink>
        <ButtonLink href="/support">Support</ButtonLink>
      </div>
    </main>
  );
}
