# Production database migrations

This repository uses **Supabase CLI SQL migrations** as its database schema source of truth. It does not use Prisma. Do not introduce a second migration history or use `prisma db push` / `supabase db reset` against production.

## Automatic deployment

The `.github/workflows/deploy-database-migrations.yml` workflow applies pending files in `supabase/migrations/` when migration files are pushed to `main`. It can also be started manually from GitHub Actions.

Configure these secrets in the GitHub **production** environment:

- `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token with access to the target project.
- `SUPABASE_DB_PASSWORD`: the database password for that project.
- `SUPABASE_PROJECT_REF`: the project's reference ID.

Protect the GitHub `production` environment with required reviewers before enabling automatic production changes. Restrict who can modify migration files and the workflow. The workflow links only the configured project and runs `supabase db push --linked --yes`; it never resets the database.

## Release safety

- Every schema change must be a new, reviewed SQL migration.
- Keep migrations backward-compatible with the currently deployed application where possible.
- Test the complete migration chain with `supabase db reset` and `supabase test db` in CI before merging.
- Back up production and verify the restore procedure before risky data migrations.
- Do not put database passwords or access tokens in repository files, build arguments, or logs.
- A successful migration workflow confirms database schema application only. It does not confirm that the Cloudflare application deployment succeeded.
- If required secrets are missing, the workflow fails before linking or changing the database.
