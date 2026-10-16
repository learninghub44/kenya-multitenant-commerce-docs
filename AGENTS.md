# Agent Instructions

Build a secure Kenya-first multi-tenant commerce SaaS with hosted storefronts and lightweight retail ERP. Inspect existing code and migrations before changing anything. Prefer a modular monolith and simple, testable boundaries.

- Tenant authorization must be enforced server-side and with Postgres RLS.
- Never trust browser-supplied tenant IDs, prices, stock counts, role claims, or payment state.
- All inventory balance changes must be atomic and recorded in an append-only stock movement ledger.
- Payment callbacks must be verified, deduplicated, reconciled, and safely logged.
- Keep service-role keys and provider credentials server-side.
- Use migrations as the source of truth for schema changes.
- Do not add fake production data or simulated payment success.
- Include tests for cross-tenant access, stock concurrency, duplicate callbacks, and invalid permissions.
- Update documentation and environment-variable examples when implementation changes.
- Report what changed, tests run, and anything not verified.