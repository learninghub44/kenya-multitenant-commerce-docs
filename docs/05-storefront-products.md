# Storefront, Products, and Publishing

## Product data
Required: tenant, title, URL slug, price, currency, and publication status. Recommended: SKU, descriptions, category, image gallery, inventory tracking flag, variants, weight/dimensions, tax classification if applicable, SEO fields, and timestamps.

Variants may represent size, color, pack, or another option. Each stock-tracked variant has a stable SKU and its own inventory balance. Enforce tenant-scoped uniqueness for slugs and supplied SKUs.

## Lifecycle
Draft is private to staff. Published items can appear publicly. Archived items cannot be purchased but remain in historical orders. Out-of-stock display behavior is configurable; checkout must always enforce availability.

## Product management
Create/edit, preview, publish/unpublish, archive, duplicate, category assignment, image ordering, variant management, and later bulk updates/CSV import. Bulk import should validate every row and return a clear error report rather than silently skipping failures.

## Historical integrity
Order items must snapshot product name, SKU, selected options, quantity, unit price, discount, currency, and applicable tax at purchase time. Product edits must not rewrite historical orders. Avoid hard deletion when referenced by orders or movements.

## Images
Use Cloudinary for delivery and transformations. Generate signed upload instructions from an authorized server endpoint; validate type, size, ownership, and asset ID. Do not trust arbitrary remote image URLs. Store useful alt text and responsive image transformations.

## Public storefront
Resolve tenant from normalized hostname/slug. Expose only active tenant and published catalogue fields. Never expose supplier costs, private stock ledger, internal notes, draft products, payment credentials, or customer data. Invalidate public caches after publish/unpublish and price changes.

## Pricing
Calculate prices, discounts, delivery and applicable taxes on the server. Use integer minor units consistently with explicit currency codes. Never silently mix currencies.