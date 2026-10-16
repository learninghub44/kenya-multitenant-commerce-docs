## Summary
<!-- What changed and why? -->

## Validation
- [ ] Type-check and lint pass
- [ ] Next.js build passes
- [ ] Cloudflare OpenNext build passes
- [ ] Database migrations and security tests pass when database code changed
- [ ] Relevant mobile and desktop flows were checked

## Security and tenancy
- [ ] Tenant isolation and RLS are preserved
- [ ] No secrets, service-role keys, tokens, or customer data are committed
- [ ] Server-side authorization is enforced; browser-supplied tenant/role/price/stock/payment values are not trusted
- [ ] Migrations are additive/reviewed and have a rollback or recovery plan where needed

## Deployment impact
- [ ] Environment variables/secrets and operational steps are documented
- [ ] No unrelated Supabase project or production database was modified
- [ ] Payment-related changes include verified callbacks, idempotency, and reconciliation tests
- [ ] Known limitations are documented
