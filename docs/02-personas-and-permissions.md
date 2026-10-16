# Personas and Permissions

## Roles
- Owner: all tenant settings, staff, payment connections, products, stock, orders, and reports.
- Manager: assigned day-to-day operations.
- Catalog editor: product, category, image, and publication management.
- Stock clerk: receive stock, count stock, and perform permitted adjustments/transfers.
- Order operator: orders, packing, dispatch, pickup, and customer communication.
- Finance viewer: read-only sales, payment, expense, and reconciliation reports.
- Customer: public storefront and their own order/customer data only.
- Platform operator: platform health, tenant status, abuse, and support workflows with audited, limited access.

## Suggested permissions
products.read/create/update/publish/archive; inventory.read/receive/adjust/transfer; orders.read/update/cancel/refund_request; customers.read/update; reports.read; purchasing.read/manage; expenses.manage; settings.store.manage; settings.payments.manage; staff.manage; audit.read.

## Rules
Users may belong to multiple tenants. Resolve active tenant context server-side and verify membership on every request. Tenant membership does not grant platform-admin access. Staff invitations must expire and be single-use. Do not allow removal of the last active owner. Payment credential changes require re-authentication or equivalent step-up checks. Refunds, stock adjustments, role changes, and payment-setting changes must be audited. Support access must never be a hidden RLS bypass.