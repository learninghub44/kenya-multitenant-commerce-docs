# CI/CD, Merge, and Release Policy

## Branch flow

1. Create a short-lived feature branch from `main`.
2. Open a pull request targeting `main`; do not push feature work directly to `main`.
3. Wait for both required CI jobs to pass: `verify` and `database-security`.
4. Review the diff, migrations, tenancy/RLS impact, and deployment configuration.
5. Merge only after the checks pass and unresolved review comments are addressed.
6. Deploy from `main` only. Use Cloudflare Workers Builds connected to this repository, with `main` selected as the production branch. Configure preview builds for pull requests if desired.
7. After deployment, run the smoke tests in [Cloudflare deployment](28-cloudflare-workers-deployment.md). A green build alone is not proof of production readiness.

## CI gates

The GitHub Actions workflow must check:
- TypeScript type-checking and ESLint.
- Standard Next.js production build.
- OpenNext Cloudflare build, so the actual deployment adapter is validated.
- A clean local Supabase reset applying every migration, followed by database security regression tests.

CI uses placeholder public Supabase values only. It must never connect to a production database or use real service-role/payment credentials. Database tests use an ephemeral local Supabase instance.

## GitHub rules to enable

Repository rulesets/branch protection are separate GitHub settings; workflow files alone do not prevent an administrator from merging a failing PR. In GitHub, open **Settings → Rules → Rulesets** (or **Branches → Branch protection rules**) and protect `main` with:
- Require a pull request before merging.
- Require status checks: `verify` and `database-security` from the `CI` workflow.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Block force pushes and branch deletion.
- Do not allow bypassing these rules except for a deliberate emergency process.

After the first workflow run, select the exact status-check names GitHub reports. Avoid requiring a check name that has not appeared yet.

## Dependency and supply-chain rules

- Dependabot opens weekly npm and GitHub Actions update PRs; review and test each update rather than enabling blind auto-merge.
- Keep dependency versions compatible with the Cloudflare adapter. Do not bypass peer-dependency failures with `--force` or `--legacy-peer-deps`.
- Commit a generated `package-lock.json` and switch CI to `npm ci` before claiming dependency installs are reproducible. Until then, CI uses `npm install`; installs may change as upstream semver ranges change.
- Prefer pinned, reviewed GitHub Actions versions and review action changes as code.
- Never print secrets in workflow logs or store tokens in source files.

## Cloudflare deployment and tokens

Preferred setup: connect the repository in **Cloudflare Dashboard → Workers & Pages → Create application / Connect to Git** and select `main` as the production branch. Cloudflare Workers Builds can generate and manage its deployment token. Do not create a GitHub secret for Cloudflare unless using GitHub Actions as the deployer instead.

If deployment is performed by GitHub Actions, add repository Actions secrets:
- `CLOUDFLARE_API_TOKEN`: scoped to the one Cloudflare account and the minimum Workers deployment permissions required.
- `CLOUDFLARE_ACCOUNT_ID`: the target Cloudflare account ID (not secret in the same way as the API token, but store it as a repository variable or secret for simple configuration).

Build-time public configuration may also be needed:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` and/or `APP_URL`, once the actual deployment URL is known.

Keep runtime secrets in Cloudflare Worker **Settings → Variables and Secrets**, not in source control:
- `SUPABASE_SERVICE_ROLE_KEY` only if server-side admin code truly requires it.
- `CLOUDINARY_API_SECRET` if Cloudinary server-side signing is used.
- `CRON_SECRET` only if scheduled endpoints exist.

Never expose a service-role key, Cloudinary API secret, database password, payment-provider credential, or Cloudflare API token using a `NEXT_PUBLIC_*` name. The Supabase URL and publishable/anon key are public configuration, but all data access must still be protected by RLS and server authorization.

## Database release safety

- Never run commerce migrations against the currently visible `Home services` Supabase project unless the owner confirms it is the dedicated commerce database.
- Use a dedicated commerce development/staging project and verify its project reference before any remote migration.
- Review migration diffs and take a recoverable backup before production schema changes.
- CI must continue to test migrations locally; it must not automatically push migrations to production.
- Production migration execution is a separate, explicitly reviewed release step.

## Release gates not yet satisfied

A green CI pipeline does not mean this app is production-ready. The dedicated commerce Supabase project, production environment variables, actual Cloudflare preview, authentication redirects, tenant isolation tests on the deployed app, backup/recovery, and payment integration/reconciliation still need to be verified. Online payment settlement is not implemented in the current storefront.
