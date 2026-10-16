# Cloudflare Workers Deployment

This repository uses Next.js 15 App Router and middleware. The initial deployment target is a temporary `workers.dev` URL; custom domains and wildcard tenant subdomains are a later step.

## Important safety gate

Do not link this app to an unrelated Supabase project. Confirm that the project is dedicated to Kenya Multi-Tenant Commerce before applying migrations. Back up an existing project and review the migration plan first. The repository migrations create and modify commerce tables, policies, and RPCs; do not run them against another application's database.

## Runtime configuration

- `wrangler.jsonc` uses the OpenNext Cloudflare adapter, `nodejs_compat`, static assets, and Worker observability.
- `open-next.config.ts` uses the default Cloudflare OpenNext configuration.
- `npm run preview` builds and runs the app in the local Workers runtime.
- `npm run deploy` builds the OpenNext output and deploys it with Wrangler.
- The Worker is configured to publish on `workers.dev` initially.

## CI/CD and deployment token options

The GitHub Actions CI workflow does not require Cloudflare, Supabase, or payment-provider tokens. It uses placeholder public Supabase values and starts a local Supabase instance for migration/security tests.

**Preferred deployment path:** connect this repository in Cloudflare Dashboard → Workers & Pages → Create application / Connect to Git. Select `main` as the production branch and configure the build command as `npm run build:cloudflare` and deploy command as `npm run deploy`. Cloudflare Workers Builds can create/manage its deployment token; no manually created GitHub Cloudflare token is needed for this path. Configure build variables and runtime secrets in the Cloudflare dashboard.

**Alternative: GitHub Actions performs the deployment.** Add these in GitHub repository Settings → Secrets and variables → Actions:
- `CLOUDFLARE_API_TOKEN`: secret API token scoped to the single Cloudflare account and minimum required Workers deployment permissions.
- `CLOUDFLARE_ACCOUNT_ID`: target Cloudflare account ID (a repository variable is fine; a secret also works).

Do not paste these values into chat, commit them, or put them in workflow YAML. The repository does not currently have a deployment workflow that consumes these GitHub secrets; do not create them unless you choose the GitHub Actions deployment path.

## Build variables and runtime secrets

Configure only variables actually used by the application. `NEXT_PUBLIC_*` values must be available at build time because Next.js compiles them into client bundles.

| Variable | Type | Purpose |
| --- | --- | --- |
| `APP_URL` | Non-secret variable | Canonical root application URL. Set to the actual Worker URL after first deployment. |
| `NEXT_PUBLIC_APP_URL` | Public variable | Canonical app URL if used by the application. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public variable | URL for the dedicated commerce Supabase project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public variable | Supabase publishable/legacy anon key; all data access must still be protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret, only if required by server code | Privileged server-only key. Never prefix with `NEXT_PUBLIC_`. |
| `CLOUDINARY_CLOUD_NAME` | Variable, if Cloudinary is used | Cloudinary account name for product images. |
| `CLOUDINARY_API_KEY` | Variable/secret, if Cloudinary is used | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Secret, if server-side signing is used | Server-side signing secret. |
| `CRON_SECRET` | Secret, only if scheduled jobs exist | Authentication for scheduled operations. |

Do not commit real values to `wrangler.jsonc`, GitHub, or `.env.example`. Set runtime secrets in Cloudflare Worker Settings → Variables and Secrets or with `wrangler secret put VARIABLE_NAME`. Never expose service-role keys, database passwords, payment credentials, Cloudinary secrets, or Cloudflare tokens through `NEXT_PUBLIC_*`.

## First deployment checklist

1. Install Node.js 22 or newer and npm.
2. The repository does not yet have a committed `package-lock.json`; CI currently uses `npm install`. Generate and commit a lockfile before switching CI to `npm ci` and claiming reproducible dependency resolution.
3. Choose the preferred Cloudflare Workers Builds integration or the alternative GitHub Actions deployer; do not configure both to deploy production on the same push.
4. Configure the public Supabase URL and key as build variables. Configure only the runtime secrets the reviewed server code actually requires.
5. Create/confirm a dedicated commerce Supabase project. Do not use the connected project named `Home services` unless you explicitly verify it is the correct database for this app.
6. Run `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run build:cloudflare`.
7. Deploy to the initial `workers.dev` URL and copy the actual hostname returned by Cloudflare. Do not guess the account-specific URL.
8. Set `APP_URL` / `NEXT_PUBLIC_APP_URL` to the actual URL if those variables are used, then rebuild if needed.
9. In Supabase Auth URL Configuration, set the Site URL to the deployed URL and add the deployed URL plus required auth callback paths to Redirect URLs. Verify sign-in and sign-out.
10. Smoke-test the homepage, auth page, onboarding, dashboard after login, and `/store/<tenant-slug>`. A temporary `workers.dev` hostname does not provide wildcard merchant subdomains.
11. Review migration diffs and use `supabase db push --dry-run` against the dedicated project before any remote migration. Apply migrations only after confirming the target project reference and recovery plan.

## Tenant routing

The app's middleware rewrites wildcard subdomains to `/store/<tenant-slug>` only when the request host is a subdomain of `APP_URL`. On the temporary Worker URL, use the explicit path `/store/<tenant-slug>`. Once a custom root domain is available, configure the root and wildcard DNS/Worker routing, set `APP_URL` to the root domain, and test reserved hostnames and tenant isolation.

## Not a production-readiness declaration

The storefront currently creates order requests, not online payments. Daraja/PayHero provider callbacks and settlement reconciliation are not implemented. Before live traffic, complete the security checklist, verify tenant isolation and RLS against a dedicated staging database, configure backups, and test rollback/recovery.
