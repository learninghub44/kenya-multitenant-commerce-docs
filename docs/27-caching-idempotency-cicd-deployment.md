# Caching, idempotency, CI/CD, and deployment boundaries

## Current deployment shape

The repository currently contains one Next.js application. It serves the merchant workspace under `/dashboard`, authentication/onboarding, and the public store route `/store/{tenantSlug}` (also reachable through wildcard subdomains when `APP_URL` and DNS are configured). It does **not** yet contain a separate platform-administrator application or platform-admin authorization surface. The reserved `admin` subdomain is excluded from merchant wildcard routing, but that exclusion is not an admin app.

Do not deploy a second "admin" project pointing at the same app and call it separated: create a real `apps/admin` application or a separate repository, with its own routes, authorization checks, CI checks, deployment target and environment variables. Keep the public store and merchant workspace as the client-facing deployment. Both apps may share the Supabase database, but the platform-admin app must use server-side, least-privilege operations and must never ship the Supabase service-role key to the browser.

## Cache policy

- Authenticated dashboard, auth, onboarding, store/order-request pages, and API responses are explicitly marked `private, no-store`. This avoids serving a previous user's HTML or stale stock/checkout state through a shared CDN cache.
- Do not add `force-cache`, ISR, `unstable_cache`, or CDN HTML caching around tenant-private records, stock balances, order status, payment status, customer data, or admin responses without a tenant-aware cache key and an explicit invalidation design.
- Static Next.js build assets remain eligible for immutable caching by their content-hashed URLs. Cloudinary serves product media; use its CDN for images rather than caching the live order/stock HTML.
- If catalogue caching is added later, cache only a read-only published-catalogue projection, keyed by tenant ID/slug plus catalogue version, with short TTL and mutation-triggered invalidation. Do not cache stock availability together with product content.
- If the app is horizontally scaled, do not assume each instance's Next.js cache is shared. Configure a supported shared cache handler/tag invalidation strategy or leave tenant data uncached.

## Idempotency and transactional stock rules

- Checkout uses a tenant-scoped idempotency key plus a request fingerprint. Replaying the same key and same payload returns the existing order; reusing it with different order details is rejected.
- Stock reservations, order lines, and the inventory movement ledger must be committed in one database transaction. Keep stable lock ordering for multi-item stock operations to reduce deadlocks.
- Order transitions lock the order row. Terminal orders (cancelled, fulfilled, refunded) cannot be transitioned again.
- Cancellation and reservation-expiry cleanup require the reserved balance to cover the release. A mismatch now raises an error and rolls the transaction back instead of silently clamping the balance and potentially consuming another order's reservation.
- Movement idempotency keys are unique per tenant. Avoid `ON CONFLICT DO NOTHING` after changing a stock balance unless the function verifies the movement was newly inserted; otherwise a duplicate ledger key can hide a duplicate balance mutation.
- Provider webhooks are not implemented. Before enabling payments, implement provider signature/authenticity verification, persist a unique provider event ID, process transaction state and order transition atomically, reject amount/currency/reference mismatches, and safely replay duplicates. Never mark payment successful from a browser redirect.

## CI configuration

The workflow at `.github/workflows/ci.yml` currently runs TypeScript, ESLint, a production build, local Supabase migrations, and pgTAP security boundary tests. npm download caching is enabled. Use these checks as required PR checks before merge.

Important follow-up:
1. Commit and maintain `package-lock.json`, then switch CI to `npm ci` and configure `actions/setup-node` with `cache: npm`. The repository currently has no committed lockfile, so dependency resolution is not fully reproducible.
2. Add behavioral database tests for cross-tenant reads/writes, concurrent last-unit checkout, duplicate checkout replay, cancellation replay, expiry cleanup, payment event replay, and fulfilment ledger consistency.
3. Add a migration-lint / fresh-database job, dependency audit, secret scan, and browser smoke tests. Pin third-party GitHub Actions to reviewed commit SHAs for hardened supply-chain controls.
4. Configure GitHub repository rules: require pull requests, require the `verify` and `database-security` checks, disallow force-pushes to `main`, and require review before production deployment.
5. Keep CI secrets empty when running local Supabase tests. Use placeholder public Supabase values only for build-time checks. Never store production credentials in the repository or expose server secrets via `NEXT_PUBLIC_*`.

## Deployment environments and secrets

Create GitHub Environments named `staging` and `production`; restrict production to the protected `main` branch and require manual approval if available on the repository plan. Store secrets at the narrowest possible environment scope.

### Client-facing deployment (current app)

- Domain: apex/root app domain plus wildcard DNS for merchant storefronts, for example `*.example.co.ke`; configure wildcard TLS at the hosting provider.
- Environment: `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and should be omitted unless a reviewed server-side feature genuinely requires it. It is never a browser variable.
- Configure Supabase Auth site URL and exact staging/production redirect URLs. Enable RLS on every tenant table and test with non-owner roles.
- Use a separate Supabase project for staging and production where feasible. Run reviewed migrations against staging first, then apply the same ordered migrations to production after approval.

### Platform admin deployment (not yet implemented)

- Create a separate Next.js app/repository and host such as `admin.example.co.ke`; do not expose the platform admin surface as a tenant workspace route.
- Give it a separate deployment project, build checks, runtime environment, auth allow-list, security headers, rate limits, audit trail, and deployment approval.
- Platform-admin authorization must be explicit and server-verified (for example a dedicated platform-admin table/claim); tenant membership or a hidden URL is not sufficient.
- Prefer a server-side admin API that validates platform-admin identity and performs narrow operations. Never put service-role credentials in client bundles. Use a separate server-side secret only if required, rotate it, and log privileged operations without logging credentials or sensitive payment payloads.
- Configure its own `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `APP_URL`, and only the server secrets its reviewed routes require. Do not copy the client's Cloudinary or payment credentials unless that app needs them.

### Deployment sequence

1. Pull request: typecheck, lint, build, migrations and DB security tests.
2. Merge to `main`: deploy client app to staging, apply staging migrations, run health and smoke checks.
3. Approved release: apply production migrations, deploy the client app, smoke test login/storefront/checkout/order operations.
4. Deploy the platform-admin app separately only after it exists and its authorization tests pass.
5. Roll back application code if smoke tests fail; database changes should be backward-compatible expand/migrate/contract changes, not destructive rollbacks.
6. Add provider payment deployment only after sandbox callback verification, replay tests, reconciliation, and operational alerting pass.

## Current blockers

- No committed dependency lockfile.
- No production deploy target or provider-specific deployment workflow has been configured.
- No separate platform-admin application exists.
- Online Daraja/PayHero payments and provider-authenticated webhook processing are not implemented.
- The latest CI run before the ESLint config correction had passing TypeScript and database tests but failed lint; wait for a fresh complete run before merge.
