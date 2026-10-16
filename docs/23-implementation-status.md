# Implementation Status

The application foundation has been expanded on the current feature branch and is available for review in PR #1. This remains an unverified development implementation, not a production-ready release.

## Implemented

- Next.js/TypeScript app, Supabase SSR/browser/admin clients, email/password auth, tenant onboarding, and tenant-role checks.
- Tenant-scoped product catalogue, product editing/status controls, category create/edit/archive and product assignment, variant management, and signed Cloudinary product image uploads.
- Tenant-safe Postgres schema, RLS, composite tenant foreign keys, integer minor-unit money, and transactional/idempotent stock receipts and adjustments.
- Public storefront route at /store/{tenantSlug}, wildcard subdomain rewrite based on APP_URL, and a public RPC restricted to active stores and published catalogue data.
- Public order-request cart. Server/database resolves product prices and validates stock, creates an idempotent pending order, and reserves tracked stock transactionally.
- 30-minute reservation expiry logic invoked when another order is created for the same tenant.
- Tenant-scoped order list, manual payment attestation for a staff member who has independently verified funds, validated order state transitions, reservation release on cancellation, and stock decrement/ledger entry on fulfilment.
- Customer and supplier creation, expense recording with audit events, purchase-order creation/submission, and transactional goods receipt posting.
- Reports for recorded paid sales, expenses, order status, and low-stock watchlist.
- GitHub Actions workflow for install, TypeScript check, lint, and build.
- Review and release checklist in docs/26-review-and-release-checklist.md.

## Not complete / blockers

- Daraja and PayHero online payments, provider authentication and callbacks, duplicate callback handling, settlement reconciliation, and refunds are not implemented. The storefront does not collect online payment.
- Full order notification/outbox delivery, automated scheduled reservation cleanup, tenant staff invitations/role administration, platform super-admin, custom-domain verification, branding, bulk imports/exports, and comprehensive reporting/accounting are not implemented.
- Purchasing UI currently supports one line per purchase order; customer/supplier editing, purchase returns, and supplier invoice reconciliation are not implemented.
- No complete automated test suite for Postgres RLS, tenant isolation, stock concurrency, checkout idempotency, or payment replay is in place.
- No successful CI run has been observed, and no dependency install, typecheck, lint, build, SQL migration, or browser E2E test has been run in the authoring environment.
- Database migrations need to be applied and reviewed in a disposable Supabase project before any production data or live traffic is used.

## Security boundaries to preserve

- Never trust a browser-supplied price, stock count, role, tenant association, or payment state.
- The service-role key must remain server-only. Public checkout and normal merchant mutations should use narrow database RPCs with role validation.
- A customer-submitted order or browser redirect is not proof of payment. Manual payment recording is a staff attestation, not provider verification.
- Apply migrations in timestamp order. Do not merge or deploy until cross-tenant RLS, concurrent stock reservation, callback replay, and backup/restore release gates pass.
