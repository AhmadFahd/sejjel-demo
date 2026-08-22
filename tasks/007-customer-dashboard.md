# 007: Customer dashboard and account view

Use case: UC-09. Status: done in prototype.

- Dashboard stats plus a card per merchant.
- Account view per merchant: balance, due date, transaction list, and a deep-green سداد الآن button with a payment icon.
- Permanent بطاقة التعرف (identity only, no amount) that a merchant scans to select the customer or to connect. Named apart from the temporary رمز تأكيد الشراء so the two are never confused at the counter.
- Profile screen with logout.

## Acceptance

- Balances on the customer side match what the merchant sees for the same pair. In seed data الريان mirrors أحمد محمد's account.
- The profile QR draws once, lazily.

## Open for MVP

Transaction history across all merchants in one list, dispute or query on a transaction, export.
