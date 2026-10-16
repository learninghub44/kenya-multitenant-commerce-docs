# Implementation Status

This repository now contains the first application scaffold on the `feat/mvp-application-foundation` branch. It is not production-ready.

## Implemented in this foundation pass

- Next.js and TypeScript project configuration.
- Responsive, neutral starter landing page.
- Environment-variable example with server-only secret warnings.
- Cookie-aware Supabase SSR client, browser client using the public anon key, and a separate server-only admin client.
- Initial Supabase migration for tenants, memberships, categories, products, variants, inventory locations, balances, and inventory movement history.
- Initial RLS policies for tenant membership, catalogue access, and inventory reads.
- Tenant-aware foreign keys, tenant-scoped SKU/slug uniqueness, integer minor-unit pricing, and nonnegative stock constraints.
- Draft pull request opened for review: [PR #1](https://github.com/learninghub44/kenya-multitenant-commerce-docs/pull/1).

## Important limitations

- No signup, login UI, tenant creation workflow, merchant console, storefront hostname routing, orders, checkout, payment adapters, webhook processing, reconciliation, notifications, audit-event service, or reporting UI is implemented yet.
- The admin Supabase client bypasses RLS. It must only be used in trusted server operations after explicit authorization; never expose it to browser code.
- Stock balance and movement mutations are intentionally not exposed to browser clients. They must be implemented as transactional, idempotent server-side database operations before stock can be received or adjusted.
- Anonymous storefront catalogue access is not enabled yet. It must be implemented as a narrow published-catalogue read path after tenant hostname resolution.
- The initial schema and policies require SQL review and real Supabase/Postgres tests. Do not apply to production before review.
- No dependency install, typecheck, lint, migration, integration, or end-to-end test has been run in this environment.
- Daraja and PayHero live payments are deliberately not configured. Confirm provider contracts, approved products, per-merchant credentials, callback verification, fees, and settlement rules before implementation.

## Next implementation order

1. Add authentication, session refresh, and a safe tenant-creation flow.
2. Add integration tests proving cross-tenant isolation and role boundaries.
3. Implement transactional stock operations with idempotency keys and concurrent-checkout tests.
4. Implement product/category/variant CRUD and signed image upload.
5. Implement hostname-based storefront routing and public published-catalogue reads.
6. Implement order snapshots, reservations, checkout, and fulfilment state transitions.
7. Integrate one payment provider in sandbox with signature verification, deduplication, and reconciliation.
8. Add audit/outbox, reports, platform operations, deployment checks, and privacy workflows.

See [the roadmap](19-roadmap.md), [security requirements](11-security-rls.md), and [acceptance criteria](16-testing-acceptance.md) for release gates.
