# Database Model

Logical starting point; confirm actual names and constraints in reviewed migrations.

## Core tables
- tenants: id, name, slug, status, currency, timezone, settings, created_at.
- tenant_domains: id, tenant_id, hostname, verified_at, primary flag, status.
- tenant_memberships: id, tenant_id, user_id, role, status.
- products: id, tenant_id, title, slug, description, status, category_id, track_inventory.
- product_variants: id, tenant_id, product_id, sku, options, price_minor, currency, status.
- product_images: id, tenant_id, product_id, asset_id, url, alt_text, sort_order.
- categories: id, tenant_id, name, slug, parent_id, status.
- inventory_locations: id, tenant_id, name, code, status.
- inventory_balances: tenant_id, variant_id, location_id, on_hand, reserved, updated_at.
- inventory_movements: id, tenant_id, variant_id, location_id, quantity_delta, type, reason, source reference, idempotency key, actor, created_at.
- stock_reservations: id, tenant_id, order_id, variant_id, location_id, quantity, status, expires_at.
- customers: id, tenant_id, name, email, phone, metadata.
- orders: id, tenant_id, order_number, customer snapshot, payment status, fulfilment status, currency, subtotal/discount/shipping/tax/total minor units, idempotency key.
- order_items: id, tenant_id, order_id, product/variant references, immutable product snapshot, quantity, unit price, discount, total.
- payment_connections: id, tenant_id, provider, environment, enabled, secret reference, public config, verified_at.
- payment_attempts: id, tenant_id, order_id, provider, provider reference, idempotency key, amount, currency, status.
- payment_events: id, tenant_id, payment attempt, provider, provider event ID, event type, verification state, safe payload, timestamps.
- refunds: id, tenant_id, order_id, payment attempt, amount, status, provider reference, actor.
- suppliers, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, expenses, audit_events, notifications.

## Constraints
Use stable non-guessable IDs. Add tenant_id to tenant-owned records and composite foreign keys where practical. Enforce tenant-scoped unique slugs, SKUs, order numbers, and idempotency keys. Enforce provider/event uniqueness. Use integer minor units and explicit currency. Use CHECK constraints for valid states and nonnegative values where appropriate. Keep movement/payment event history append-only for ordinary roles. Index tenant, status, date, SKU, order lookups, and measured report queries.