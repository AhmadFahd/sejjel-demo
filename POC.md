# POC: سجّل / Sajjel

Debt ledger between a merchant and a customer, Saudi context, amounts in ر.س.
Scope of the proof of concept: prove the flows work on a prototype. No backend, no persistence.

Detailed tasks live in [tasks/](tasks/). The prototype behaviour is described in [PROTOTYPE.md](PROTOTYPE.md).

## Actors

- Merchant (تاجر): keeps the ledger, records purchases on credit, sets limits.
- Customer (عميل): approves purchases, sees balances, settles.

## Use cases

- UC-01: sign in by mobile number and OTP, pick a role.
- UC-02: merchant sees customers, total outstanding, overdue count.
- UC-03: merchant opens a customer account: balance, limit, available, due date, transactions.
- UC-04: merchant records a new purchase: pick customer (chips or profile QR), amount, optional description, optional invoice.
- UC-05: purchase is blocked when it would breach the customer's credit limit.
- UC-06: purchase warns when the customer is overdue; merchant may continue anyway.
- UC-07: customer approves a purchase by showing a QR that the merchant scans; the code expires after 2 minutes and can be regenerated.
- UC-08: merchant connects a new customer through the same QR handshake; the new customer inherits default limits.
- UC-09: customer sees their merchants, total debt, and per-merchant transaction history.
- UC-10: customer settles in full or a custom amount, by Apple Pay, مدى, or a card; the merchant is notified and the balance updates.
- UC-11: an invoice or receipt attached to a purchase is visible to both sides from the transaction row.
- UC-12: notifications with unread badges; purchase approvals are actionable from the notification.
- UC-13: merchant sets default limit and term, and overrides them per customer.
- UC-14: either side hides the amounts on screen behind dots, and shows them again.
- UC-15: both dashboards count the transactions behind the balances.
- UC-16: the merchant's own QR sits on the home screen, ready to be scanned.
- UC-17: a customer without the app pays from a web link the merchant sends over WhatsApp.
- UC-18: a progress bar shows how much of the credit limit is used, and colours up as it fills.
- UC-19: everything falls due on one day a month, the 27th, and the app says so everywhere.

## Out of scope for the POC

- Real authentication, real payment gateway, real backend.
- Persistence between sessions.
- Multi-merchant staff accounts, reporting, exports.
- Arabic/English switching. The POC is Arabic only, RTL.

## Seed data

Merchant بقالة الريان, defaults 1,000 ر.س / 30 days. Customers: أحمد محمد 800 ر.س due 27 أغسطس, خالد علي 0, سالم العتيبي 1,250 ر.س overdue since 27 يوليو with a custom 1,500 limit. On the customer side, سوق النور has a 500 limit and مخبز الضحى a 600 limit at 420 ر.س owed.

Every due date falls on the 27th (UC-19).
