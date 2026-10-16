# Analytics and Reports

## MVP reports
Sales totals by date range; orders by payment and fulfilment state; best-selling products by quantity/revenue; low/out-of-stock items; stock movement and stocktake variance; payment reconciliation exceptions; average order value; cancellations and refunds.

Later: gross margin using recorded cost snapshots, supplier purchasing, expenses by category, branch performance, repeat customers, inventory ageing, reorder suggestions, and CSV exports.

Define each metric. Keep gross sales, discounts, refunds, taxes, delivery charges, and provider fees separate. Reports are operational summaries, not audited financial statements. Every query is tenant-scoped, role-checked, paginated, and date-limited. Audit exports. Never fabricate numbers when no records exist; show an empty state.