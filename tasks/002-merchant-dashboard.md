# 002: Merchant dashboard and account view

Use cases: UC-02, UC-03. Status: done in prototype.

## Dashboard

- Three stats: number of customers, total outstanding, number overdue.
- Customer cards, each with name, balance, and a status pill.
- Status pills: 🟢 مسدد, 🔵 حساب قائم, 🔴 تجاوز الموعد, ⚫ بلغ الحد. An amber "due soon" style exists in CSS but no seed customer uses it and nothing computes it.

## Account view

- Hero with the balance, then limit, available, and due date.
- Transaction list, newest first. Rows carry an invoice tag when one is attached (see task 009).
- A ✦ marker shows on customers whose limit is overridden (سالم العتيبي in seed data).

## Acceptance

- Dashboard totals match the sum of the customer cards.
- Opening a customer shows the same balance as their card.

## Open for MVP

Search and sort on the customer list, due-soon computation, pagination of transactions.
