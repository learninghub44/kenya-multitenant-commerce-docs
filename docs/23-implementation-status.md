# Implementation Status

This repository contains an early application scaffold on `feat/mvp-application-foundation`. It is not production-ready.

## Implemented

- Next.js and TypeScript project configuration and responsive starter landing page.
- Environment-variable example with server-only secret warnings.
- Cookie-aware Supabase SSR client, browser client using only the public anon key, and a separate server-only admin client.
- Initial Supabase migration for tenants, memberships, categories, products, variants, inventory locations, balances, and inventory movement history.
- Initial RLS policies, tenant-aware foreign keys, tenant-scoped SKU/slug uniqueness, integer minor-unit pricing, and nonnegative stock constraints.
- Supabase session-refresh middleware.
- Email/password sign-up and sign-in UI using Supabase Auth.
- Server-rendered dashboard that checks the authenticated user and loads only their active tenant memberships.
- Tenant onboarding through a database RPC that atomically creates a tenant and its owner membership. The browser cannot set its own role or supply another user's ID.
- Server-side sign-out endpoint.
- Tenant-scoped product catalogue with create/edit forms and draft/published status controls.
- Atomic database RPC creates a draft product and matching draft KES-priced variant; validated edit/status changes use a separate role-authorized RPC.
- Catalogue write hardening removes direct authenticated-client write policies for products and variants so edits must pass through validated database operations.
- Inventory overview with a default Main store location, on-hand/reserved display, and stock receipt/adjustment form.
- Atomic, idempotent inventory RPC serializes retries and concurrent movements, validates stock roles, prevents negative stock or reducing below reserved quantity, and updates the balance and ledger in one transaction.
- Draft pull request: [PR #1](https://github.com/learninghub44/kenya-multitenant-commerce-docs/pull/1).

## Important limitations

- Signup confirmation, email templates, redirect URLs, password policies, and rate limits depend on Supabase Auth project configuration and still need end-to-end validation.
- The new tenant-onboarding migration must be applied in a development Supabase project before onboarding works.
- Product editing and draft/published status controls exist, but category management, variant management, image uploads, storefront hostname routing, orders, checkout, payment adapters, webhook processing, reconciliation, notifications, audit-event service, and reporting UI are not implemented yet.
- The admin Supabase client bypasses RLS. It must only be used in trusted server operations after explicit authorization; never expose it to browser code.
- Stock balance and movement mutations are intentionally not exposed to browser clients; receipt/adjustment is available through a transactional, idempotent database RPC but still needs concurrency and RLS tests.
- Anonymous storefront catalogue access is not enabled yet.
- The initial schema and policies require SQL review and real Supabase/Postgres tests. Do not apply to production before review.
- No dependency install, typecheck, lint, migration, integration, or end-to-end test has been run in this environment.
- Daraja and PayHero live payments are deliberately not configured. Confirm provider contracts, approved products, per-merchant credentials, callback verification, fees, and settlement rules before implementation.

## Next implementation order

1. Apply and test the migrations in a development Supabase project; validate auth, tenant creation, slug conflicts, and cross-tenant RLS.
2. Add integration tests proving cross-tenant isolation and role boundaries.
3. Implement transactional stock operations with idempotency keys and concurrent-checkout tests.
4. Implement category management, variant management, and signed image upload.
5. Implement hostname-based storefront routing and public published-catalogue reads.
6. Implement order snapshots, reservations, checkout, and fulfilment state transitions.
7. Integrate one payment provider in sandbox with signature verification, deduplication, and reconciliation.
8. Add audit/outbox, reports, platform operations, deployment checks, and privacy workflows.

See [the roadmap](19-roadmap.md), [security requirements](11-security-rls.md), and [acceptance criteria](16-testing-acceptance.md) for release gates.
