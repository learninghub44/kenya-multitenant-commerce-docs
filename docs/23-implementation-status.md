# Implementation Status

The project owner reports that the app is deployed and Supabase is connected. This status describes the source in this checkout; the live deployment and signed-in Supabase UI were not verified during these frontend changes.

## Phase 1 implementation in progress

- Added a server-only tenant access resolver that derives the signed-in user, active tenant and active membership from Supabase using the requested tenant slug. It never accepts a browser-supplied tenant ID or role.
- Wrapped tenant access resolution in React `cache` so layouts and pages in the same server render can share the lookup.
- Added a central typed tenant permission matrix and migrated the tenant dashboard layout and overview page to it.
- Changed the tenant dashboard unauthenticated redirect to the documented `/login` route.
- Migrated the categories, ERP, inventory, orders, products, reports and store-profile server pages to the shared tenant resolver and permission matrix. All seven page routes now redirect unauthenticated users to `/login` and derive tenant membership server-side.
- Added tenant dashboard loading and recoverable error boundaries.
- Remaining Phase 1 work: shared UI primitive consolidation, automated authorization tests, review of per-page loading/error/empty states, and running the complete validation suite. These changes have not yet been locally built or typechecked.
- No database migration, production data, deployment configuration, or live Supabase project was changed.
- TypeScript, ESLint, Next.js production build and Cloudflare OpenNext build have not been run for this branch. Do not merge until those checks and the remaining phase acceptance criteria pass.

## Implemented

- Catalogue import (CSV, Shopify/WooCommerce exports, Google Sheets, store URLs) with atomic idempotent `import_catalogue_rows` RPC, opening stock via the ledger, and audit history. See docs/32-catalogue-import.md.

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
- Full order notification/outbox delivery, automated scheduled reservation cleanup, custom-domain verification, branding, bulk imports/exports, and comprehensive reporting/accounting are not implemented.
- Purchasing UI currently supports one line per purchase order; customer/supplier editing, purchase returns, and supplier invoice reconciliation are not implemented.
- No complete automated test suite for Postgres RLS, tenant isolation, stock concurrency, checkout idempotency, or payment replay is in place.
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

## Phase 1 foundations (central access layer)

- `src/lib/access/`: `requireUser()` and `requireTenantAccess(slug, { permission, area, path })` (server-only, `React.cache`d). Signed out -> `/login?next=`; unknown slug or non-member -> `notFound()`; suspended/closed tenant -> a dedicated "workspace unavailable" page; missing permission -> the shared access-denied page. Lookup failures are logged server-side and surface as a generic error with a request ID.
- Migration `202611130001_workspace_access_rpc.sql` adds `get_workspace_access(p_slug)`. RLS only exposes active tenants to members, so without it a suspended workspace could not be told apart from a missing one. It derives `auth.uid()` in Postgres and returns only the caller's own active membership. **Apply it before deploying this code**, or dashboard pages will error.
- Single permission map (`src/lib/permissions.ts`) and nav config (`src/lib/navigation.ts`); see docs/02.
- UI primitives in `src/components/ui/`: Button, ButtonLink, Card, Badge, Alert, PageHeader (breadcrumbs), EmptyState, Skeleton, DataTable (client-side search and pagination over already-authorised rows), ErrorState. Existing `dashboard-primitives` wrap them. The new primitives are not yet adopted across every page.
- Data-load failures use `failLoad()`; users no longer see "confirm migrations" text.
- Tests: `npm test` (Node test runner, no new dependency) covers the permission map, nav/permission agreement, access outcomes and SQL role parity. SQL test `supabase/tests/workspace_access.test.sql` is structural only.
- Known gaps: the activity log is owner-only in both app and RPC (the audit_events RLS policy also admits finance); no behavioural SQL test for `get_workspace_access` yet.

## Dashboard page depth (mobile-first pass)

- Orders: status filters with counts (All, Open, Unpaid, Fulfilled, Cancelled), search by order number, customer, phone (any format) or product, "Show more" paging, tap-to-call and WhatsApp links built from the customer phone, and the customer's order note is now shown. Logic lives in `src/lib/order-filters.ts` and `src/lib/phone.ts`.
- Reports: 7 day / 30 day / 90 day / all-time selector (`?range=`), average order value, and a paid-sales trend (daily for 7/30 days, monthly otherwise). Days are Nairobi calendar days (`src/lib/report-periods.ts`). A notice appears when the 1,000-row load cap may hide older orders.
- Activity: timestamps now use Africa/Nairobi time instead of the server's timezone.
- Payments: merchant-facing wording replaces operator setup notes (no environment variable or migration names shown to merchants).
- Not done: editing customers and suppliers (writes are revoked for `authenticated`; needs a reviewed migration and RPCs), multi-line purchase orders, online payment collection.

