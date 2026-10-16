# Product Requirements Document

## Summary
A multi-tenant online store and retail operations SaaS for Kenyan SMEs. Every merchant receives a private workspace and a public storefront on a tenant subdomain. Merchants can publish products, manage stock, receive orders, configure supported payment connections, track fulfilment, and review sales.

## Problem
Many small businesses combine social selling, manual stock notes, spreadsheets, and separate M-PESA/order processes. This causes overselling, missed orders, inconsistent product details, and weak visibility into sales and stock.

## Goals
- Let a merchant launch a storefront without coding.
- Make adding, editing, publishing, and updating products straightforward.
- Keep stock reliable through transactional updates and a movement ledger.
- Support customer checkout and provider-confirmed payments.
- Add practical ERP workflows: suppliers, purchasing, customers, expenses, and reports.
- Keep tenant data, staff, settings, and payment credentials isolated.
- Work well on affordable phones and slow connections.

## MVP
1. Authentication, tenant creation, memberships, roles, and RLS.
2. Store profile, branding, delivery settings, and tenant subdomain.
3. Product catalogue, categories, variants, images, SKUs, prices, and publication state.
4. Stock balances, stock movements, low-stock alerts, and adjustments with reasons.
5. Public storefront, cart, checkout, and customer order confirmation.
6. Orders, payment attempts, verified callbacks, and reconciliation exceptions.
7. Merchant order fulfilment and cancellation workflows.
8. Basic reports: sales, orders, top products, low stock.
9. Audit events, platform support controls, and operational monitoring.

## ERP phases
Phase 2: suppliers, purchase orders, partial goods receipts, stocktakes, locations/transfers, expenses, CSV import/export, bulk product editing.
Later: invoices, quotes, coupons, CRM segments, barcode workflows, accounting exports, advanced analytics, custom domains, and additional notification channels.

## Non-goals
Do not build full double-entry accounting, payroll, manufacturing, or a microservice architecture in the first release. Do not promise automatic tax compliance without country-specific review. Do not imply the platform itself holds merchant funds.

## Success measures
Time to first published product/order; checkout conversion; payment confirmation reliability; fulfilment time; stock discrepancy rate; active merchants; repeat orders; support burden; and zero confirmed cross-tenant exposure.

## Release gates
Live payments require provider-approved configuration, callback verification, replay protection, reconciliation, and tested failure paths. Production multi-tenancy requires passing RLS and cross-tenant tests.