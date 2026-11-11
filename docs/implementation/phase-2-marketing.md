# Phase 2 — Public marketing pages

- Added public feature, workflow, pricing-information, privacy-draft and terms-draft pages on a separate feature branch.
- Public claims are constrained to the current order-request workflow; online payment collection is explicitly stated as unavailable.
- Added robots and sitemap routes. Sitemap output requires NEXT_PUBLIC_SITE_URL to be configured.
- Privacy and Terms are review drafts, not legal advice or approved contractual policy.
- GitHub CI type-check, lint, Next.js build, Cloudflare OpenNext build and database-security checks passed on the current PR head. The separate Cloudflare Workers Builds integration check failed and must be investigated before merge.
