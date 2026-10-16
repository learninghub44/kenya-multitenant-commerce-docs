# Open Decisions

Record each decision with date, owner, options, evidence, and consequences.

1. Brand, production domain, and reserved subdomains.
2. Hosting plan confirmation for wildcard DNS, TLS, and routing.
3. One store per tenant or multiple stores/branches.
4. Stock reservation policy and timeout behavior.
5. Optional versus required inventory tracking.
6. Daraja and PayHero credential model, approved products, and settlement rules.
7. Callback verification, reconciliation, refund support, fees, and settlement timing.
8. Guest checkout versus customer accounts and order lookup verification.
9. Delivery zones, rates, pickup, and shipping integrations.
10. Tax/receipt responsibilities and applicable legal requirements.
11. Email/SMS/WhatsApp provider, consent, and costs.
12. Data retention, backups, support access, and tenant deletion.
13. Whether custom domains are MVP.
14. CSV import format and conflict behavior.
15. SaaS pricing, limits, trial, and billing provider.

Current assumptions: Kenya first, KES default, English-first with future Kiswahili, Supabase for database/auth, Cloudinary for images, modular monolith, and tenant/payment/inventory correctness as release blockers.