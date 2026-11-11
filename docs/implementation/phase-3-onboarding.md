# Phase 3 — Progressive onboarding

- Reworked workspace setup into a two-step flow with live authenticated slug availability checks and a final server-side preflight before creation.
- Added an atomic authenticated RPC that creates the tenant and optional public store profile by delegating to existing auth.uid()-derived and role-checked RPCs.
- Added post-creation setup checklist and isolated pgTAP tests for anonymous/authenticated RPC privileges and atomic creation.
- Updated the dashboard root authentication redirect to the canonical /login route and clarified the optional registration phone field.
- New migration: 202611110001_onboarding_slug_preflight_and_profile_rpc.sql. It follows the existing migration sequence and does not alter earlier migrations.
- GitHub type-check, lint, Next.js build, Cloudflare OpenNext build and database-security checks passed on this PR head. The external Cloudflare Workers Builds integration check failed; investigate before merge.
