import "server-only";

import { NextResponse } from "next/server";
import type { AccessOutcome } from "./outcome";

/** Maps an access outcome to a JSON error response for route handlers; null = allowed. */
export function apiErrorForOutcome(access: { failed: boolean; outcome: AccessOutcome }): NextResponse | null {
  if (access.failed) return NextResponse.json({ error: "Could not verify your business access." }, { status: 500 });
  switch (access.outcome.kind) {
    case "login": return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    case "not_found": return NextResponse.json({ error: "Business not found." }, { status: 404 });
    case "unavailable": return NextResponse.json({ error: "This workspace is unavailable." }, { status: 403 });
    case "denied": return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    case "ok": return null;
  }
}
