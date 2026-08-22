# 013: Transactions counter

Use case: UC-15. Status: done in prototype.

## Merchant dashboard

A card under the three stats counts every completed transaction across all customers, split into purchases and settlements: "5 عملية · سجل النشاط والعمليات". The number is derived from the ledgers, so it climbs as purchases are confirmed and payments land.

## Customer dashboard

The same card across all merchants: total, purchases made, settlements paid.

## Acceptance

- The total equals the sum of the transaction rows visible in the account views.
- Confirming a purchase or a payment raises it on the next render.

## Open for MVP

A period filter (this month, this year), and a tap-through to a combined transaction list.
