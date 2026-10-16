# Kenya Multi-Tenant Commerce & Retail ERP

A Kenya-first, multi-tenant commerce SaaS combining hosted storefronts with practical retail operations: product publishing, inventory/stock control, orders, purchasing, customers, sales reporting, and payment integrations.

> **Status:** early application scaffold and initial database foundation. This is not a deployed or production-ready application. Provider contracts, fees, settlement rules, and tax/accounting obligations must be verified before launch.

## Product vision

Help Kenyan SMEs sell online and manage day-to-day retail operations from one mobile-first workspace. Every business gets an isolated store, a public storefront on its own subdomain, and tools to maintain its catalogue, stock, orders, and business records.

## Application scaffold

The `feat/mvp-application-foundation` branch includes a Next.js/TypeScript starter, Supabase session refresh, email/password authentication UI, authenticated tenant dashboard, atomic tenant onboarding RPC, tenant-scoped product listing, and atomic product/default-variant creation RPC. It remains an early scaffold: migrations and application flows have not yet been tested against a configured Supabase project.

**Implementation progress and known limitations:** [Implementation status](docs/23-implementation-status.md).

## Documentation map

- [Product requirements](docs/01-product-requirements.md)
- [Personas and permissions](docs/02-personas-and-permissions.md)
- [Core workflows](docs/03-workflows.md)
- [UX and design system](docs/04-ux-design-system.md)
- [Storefront, products and publishing](docs/05-storefront-products.md)
- [ERP and inventory management](docs/06-erp-inventory.md)
- [Orders, fulfilment and returns](docs/07-orders-fulfilment.md)
- [Payments: Daraja and PayHero](docs/08-payments.md)
- [Architecture and tenancy](docs/09-architecture-tenancy.md)
- [Database model](docs/10-database-model.md)
- [Supabase RLS and authorization](docs/11-security-rls.md)
- [API conventions](docs/12-api-design.md)
- [Notifications and audit trail](docs/13-notifications-audit.md)
- [Analytics and reports](docs/14-analytics-reports.md)
- [Admin and merchant settings](docs/15-admin-settings.md)
- [Testing and acceptance criteria](docs/16-testing-acceptance.md)
- [Deployment and operations](docs/17-deployment-operations.md)
- [Privacy and compliance checklist](docs/18-privacy-compliance.md)
- [MVP roadmap](docs/19-roadmap.md)
- [Open decisions](docs/20-open-decisions.md)
- [Environment variables](docs/21-environment-variables.md)
- [Glossary](docs/22-glossary.md)
- [Implementation status](docs/23-implementation-status.md)
- [Agent instructions](AGENTS.md)

## Stack and architecture

- TypeScript and Next.js for merchant console and public storefronts.
- Supabase Postgres, Auth, and Row Level Security for data and identity.
- Cloudinary for product image transformation and delivery.
- A host that explicitly supports wildcard subdomains and managed TLS; validate platform limits before committing.
- Server-side payment adapters for Daraja and PayHero, with verified callbacks, idempotency, and reconciliation.
- GitHub Actions for checks and deployment after tests are in place.

Prefer a modular monolith and simple, well-tested boundaries. This is not a mandate to over-engineer.

## Non-negotiable rules

1. Every tenant-owned row is scoped to a tenant_id; server authorization and database RLS must both enforce tenant isolation.
2. Never trust a tenant ID, price, discount, stock quantity, payment status, or role supplied by the browser.
3. Never mark an order paid based only on a browser redirect or client-side response.
4. Verify provider callbacks, store provider event IDs, and process duplicate callbacks safely.
5. Reserve/decrement stock atomically and record every stock movement with a reason.
6. Keep secrets server-side; never expose service-role keys or provider credentials to the browser.
7. Use migrations as the source of truth for database changes. Do not make undocumented production-only schema edits.
8. Do not use fake production payment success, fake stock, or fabricated analytics.
9. Make loading, empty, validation, permission-denied, and failure states explicit in the UI.
10. Keep an auditable trail for sensitive actions such as refunds, stock adjustments, role changes, and payment-setting updates.

## First implementation milestone

Build tenant signup and isolation, merchant profile/settings, product CRUD and publishing, stock ledger, public store by subdomain, cart/checkout, order management, and one verified payment path in sandbox. Add the second provider only after the payment abstraction and reconciliation flow are tested.

Do not deploy live payments or describe the product as production-ready until the security, inventory, payment, and operational release gates in the documentation have passed.
