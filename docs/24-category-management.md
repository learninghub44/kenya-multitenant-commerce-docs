# Category Management

- [x] Tenant-scoped category listing, sorted by name.
- [x] Create categories through a database RPC that validates name/slug and checks owner/manager/catalog-editor membership.
- [x] Removed direct category write policy; category writes use the validated RPC.
- [ ] Assign categories to products, edit/archive categories, and prevent archiving categories still referenced by products.
- [ ] Integration-test tenant isolation and role boundaries against a real Supabase/Postgres instance.

The categories screen is available at `/dashboard/[tenantSlug]/categories`. It deliberately does not claim product assignment is implemented.
