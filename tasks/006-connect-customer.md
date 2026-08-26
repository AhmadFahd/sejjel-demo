# 006: Connect a new customer

Use case: UC-08. Status: done in prototype.

## Flow

1. Merchant enters the customer's mobile number.
2. Same QR handshake as task 005: the customer shows a code, the merchant scans it.
3. The customer is created with the merchant's default limit and term.

## Acceptance

- After the handshake the new customer appears on the dashboard with a zero balance and inherited limits.
- In the prototype this creates فيصل الدوسري from the prefilled number 0561 234 567.

## Open for MVP

What happens when the number belongs to someone who has never used the app, invitation by SMS, and whether a customer can refuse a connection.

## Decided since

The connection happens inside عملية جديدة; the MVP has no add-customer entry point ([MVP.md](../MVP.md)).
