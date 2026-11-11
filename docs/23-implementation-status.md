# Implementation Status

The project owner reports that the app is deployed and Supabase is connected. This status describes the source in this checkout; the live deployment and signed-in Supabase UI were not verified during these frontend changes.

## Implemented

- Next.js/TypeScript app, Supabase SSR/browser/admin clients, email/password auth, tenant onboarding, and tenant-role checks.
- Responsive business workspace picker, tenant overview, shared desktop/mobile navigation, role-aware page access, and sign-in redirects that return users to their requested page.
- Tenant-scoped product catalogue, product editing/status controls, category create/edit/archive and product assignment, variant management, and signed Cloudinary product image uploads.
- Tenant-safe Postgres schema, RLS, composite tenant foreign keys, integer minor-unit money, and transactional/idempotent stock receipts and adjustments.
- Public storefront route at /store/{tenantSlug}, wildcard subdomain rewrite based on APP_URL, and a public RPC restricted to active stores and published catalogue data.
- Public order-request cart. Server/database resolves product prices and validates stock, creates an idempotent pending order, and reserves tracked stock transactionally.
- 30-minute reservation expiry logic invoked when a storefront refresh or another order occurs for the same tenant.
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
- Local dependency install, TypeScript check, lint, Next.js production build, and Cloudflare OpenNext build pass for the UI changes in this checkout. No GitHub Actions run or authenticated browser end-to-end test against the connected Supabase project was verified.
- The live Supabase schema was not inspected during these frontend changes; review migration status before making any future production schema change.

## Security boundaries to preserve

- Never trust a browser-supplied price, stock count, role, tenant association, or payment state.
- The service-role key must remain server-only. Public checkout and normal merchant mutations should use narrow database RPCs with role validation.
- A customer-submitted order or browser redirect is not proof of payment. Manual payment recording is a staff attestation, not provider verification.
- Apply migrations in timestamp order. Do not merge or deploy until cross-tenant RLS, concurrent stock reservation, callback replay, and backup/restore release gates pass.


## Caching, idempotency and deployment review

- Dynamic/private dashboard, authentication, onboarding, storefront/order-request and API responses now receive `private, no-store` cache headers; immutable build assets can still use the framework's content-hashed asset caching.
- CI now caches npm downloads and the ESLint flat-config composition has been corrected. The latest run must still finish before merge.
- Migration `202610160021_order_idempotency_and_stock_consistency.sql` blocks repeated terminal order transitions and makes reservation-release operations fail closed when the reserved quantity does not reconcile.
- Deployment split, environment secrets, cache policy, CI hardening and remaining blockers are documented in `docs/27-caching-idempotency-cicd-deployment.md`.
- The project owner reports an existing deployment and connected Supabase, but the live target and settings were not verified in this checkout. No production data or migrations were changed here; the separate platform-admin app has not been implemented.
