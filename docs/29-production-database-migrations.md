# Production database migrations

This repository uses **Supabase CLI SQL migrations** as its database schema source of truth. It does not use Prisma. Never run `supabase db reset` against production.

## Automatic deployment

The `.github/workflows/deploy-database-migrations.yml` workflow applies pending SQL migrations when migration files reach `main`. It can also be started manually from GitHub Actions.

For production migration execution, configure these secrets in the GitHub **production** environment:

- `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token with access to the target project.
- `SUPABASE_DB_PASSWORD`: the database password for that project.
- `SUPABASE_PROJECT_REF`: the project's reference ID.

**If those secrets are not configured, the migration job safely skips database changes with a warning instead of failing the application deployment.** Cloudflare deployment is a separate process and may continue. The production database will remain unchanged until the secrets are added and the migration workflow is run again. Features that depend on unapplied migrations must not be treated as live.

The workflow links only the configured project and runs `supabase db push --linked --yes`; it never resets the database. Protect the GitHub `production` environment with required reviewers and restrict who can modify migration files and this workflow.

## Release safety

- Every schema change must be a new, reviewed SQL migration.
- Keep migrations backward-compatible with the currently deployed application where possible.
- Test the complete migration chain with `supabase db reset` and `supabase test db` in CI before merging.
- Back up production and verify the restore procedure before risky data migrations.
- Never put database passwords or access tokens in repository files, build arguments, or logs.
- A successful migration workflow confirms database schema application only; it does not confirm that the Cloudflare application deployment succeeded.
