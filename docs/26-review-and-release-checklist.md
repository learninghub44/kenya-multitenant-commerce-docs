# Review and Release Checklist

This document describes the current implementation on `feat/mvp-application-foundation`. It is a review checklist, not a claim that production release gates have passed.

## Implemented in this branch

- Supabase email/password authentication, tenant onboarding, role-aware merchant pages, and tenant-scoped database foundations.
- Product drafts, edit/status controls, category create/edit/archive and assignment, product variants, signed Cloudinary upload, and image metadata.
- Inventory balance overview and idempotent receipt/adjustment RPCs.
- Explicit public storefront route at `/store/{tenantSlug}`; wildcard subdomain rewrite when `APP_URL` is the root domain.
- Public catalogue read RPC exposes only active stores and published products/variants/categories.
- Public order request/cart. Prices are loaded and validated in the database; stock-tracked variants are reserved transactionally, requests are idempotent, and abandoned reservations are released on a subsequent checkout after 30 minutes.
- Tenant-scoped orders view; manual payment recording requires an authorized staff member to attest to an actual payment reference; state transitions are checked in the database; fulfilment decrements reserved and on-hand stock in one transaction and records a movement.
- Customer and supplier creation, expense recording with audit event, purchase order creation/submission, and goods receipt posting to the stock ledger.
- Live-record reports for recorded paid sales, expenses, order statuses, and low stock.
- GitHub Actions workflow for dependency installation, TypeScript, lint, and production build.

## Not yet complete or not verified

- **Daraja/PayHero integration:** no provider initiation API, authenticated/verified callback processor, settlement reconciliation, refund flow, or sandbox end-to-end test. Manual payment recording is not a payment gateway.
- **Online payment is disabled:** public storefront submits an order request only. It does not collect payment.
- Product/category/variant lifecycle has basic controls; there is no bulk import/export, variant image ordering/removal UI, custom store branding, discounts, shipping rules, or customer-facing order tracking.
- Reservation expiry cleanup currently runs when a new order is inserted for the same tenant; a scheduled cleanup job/monitor is still needed for quiet stores.
- Purchase order UI currently creates one line per order; there is no supplier balance/accounting, partial receipt history screen, purchase returns, or invoice matching.
- No tenant staff invitation/role-management screen, platform super-admin console, custom-domain verification, or DNS/TLS automation.
- Reports are operational summaries over the latest 1,000 loaded rows, not a full accounting/tax ledger or date-filtered analytics.
- No complete audit/outbox worker, email/SMS delivery provider, alerting, backup/restore drill, privacy request workflow, or production deployment setup.
- No confirmed execution of migrations against a real Supabase project. No dependency install, TypeScript check, lint, build, browser E2E, RLS test, concurrent-stock test, webhook replay test, or backup restore has been completed in the authoring environment.
- The workflow was added, but no successful CI run has been observed yet. Check the PR's Checks tab.

## Required environment variables

- `APP_URL`: public root domain URL (apex/root), for example `https://example.co.ke`; required for wildcard subdomain rewrites.
- `NEXT_PUBLIC_APP_URL`: browser-visible canonical URL if used by auth redirects.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public Supabase project URL and anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only; never expose to browser code. Current public checkout and merchant RPC flows should not need it.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: server-side signed image upload. Do not put the API secret in a `NEXT_PUBLIC_` variable.
- `CRON_SECRET`: reserved for a future authenticated scheduled cleanup/operations endpoint.
- `LOG_LEVEL`: optional operational logging configuration.

## Migration order

Apply every migration in timestamp order, `202610160001` through `202610160016`, to a disposable development Supabase project first. Review each migration, inspect SQL errors, and test cross-tenant isolation before using any production data. Never skip an earlier migration.

## Review procedure

1. Open [PR #1](https://github.com/learninghub44/kenya-multitenant-commerce-docs/pull/1) and inspect the Files changed tab.
2. Wait for GitHub Actions checks and address failures; a configured Supabase environment is required for database tests.
3. Apply migrations to a new development database and verify that a user in Tenant A cannot read or mutate Tenant B's records.
4. Test duplicate checkout keys, stock contention for the final unit, reservation expiry, purchase receipts, payment-role boundaries, and fulfillment ledger changes.
5. Configure Cloudinary and test image uploads with authorized and unauthorized users.
6. Do not enable live payments until the provider-specific integration, callback verification, replay handling, reconciliation, refunds, and sandbox tests are complete.
7. Merge only after the review and release gates pass.
