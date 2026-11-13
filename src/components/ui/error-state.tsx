"use client";

import Link from "next/link";
import { Button } from "./button";
import { ButtonLink } from "./button";

/**
 * Shared error-boundary body. `digest` is the Next.js server error digest; it
 * matches the entry in server logs, so support can find the real cause without
 * the user ever seeing schema or database details.
 */
export function ErrorState({ digest, reset, eyebrow = "Business workspace" }: { digest?: string; reset: () => void; eyebrow?: string }) {
  return (
    <main className="dashboard-page" role="alert">
      <p className="eyebrow">{eyebrow}</p>
      <h1>We could not load this page</h1>
      <p className="auth-description">
        Something went wrong on our side. Try again in a moment. Your business records have not been changed by this error.
      </p>
      {digest ? <p className="auth-description">Request ID: <code>{digest}</code>. Quote it if you contact support.</p> : null}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button variant="primary" onClick={() => reset()}>Try again</Button>
        <ButtonLink href="/dashboard">Back to your businesses</ButtonLink>
      </div>
      <p className="auth-description"><Link href="/support">Contact support</Link></p>
    </main>
  );
}
