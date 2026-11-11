# Phase 5 — Team management and audit history

- Added owner-only team and activity pages with role changes, member removal, invitation creation/revocation and audit history.
- Added one-time invitation tokens stored as SHA-256 digests, seven-day expiry, verified-email matching and authenticated acceptance.
- Added serialized owner role/removal RPCs with last-active-owner protection and audit events for team changes.
- Invitation email delivery is not configured; owners privately share the one-time link. No email-sending success is simulated.
- Added isolated pgTAP checks for RLS, RPC privileges, verified-email matching, token expiry/hash storage and last-owner safeguards.
- New migration: 202611110002_tenant_team_invitations_and_audit.sql. Merge only after Phase 3 PR #21 (migration 202611110001) so migration history remains chronological.
- GitHub type-check, lint, Next.js build, Cloudflare OpenNext build and database-security checks passed on the current PR head.
