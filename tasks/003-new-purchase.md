# 003: New purchase on credit

Use case: UC-04. Status: done in prototype.

## Flow

1. Merchant picks a customer, either from chips or by scanning that customer's permanent profile QR.
2. Enters the amount. A projected-balance line updates live and flags a limit breach.
3. Optional description.
4. Optional invoice or receipt (task 009).
5. Submit. Routing: over limit → block screen; customer overdue → warning with متابعة على أي حال; otherwise straight to the QR handshake (task 005).

## Acceptance

- The projected line shows balance after the purchase and turns to a breach warning at the limit.
- Scanning a profile QR selects the right customer.
- Submitting with no customer or no amount does nothing and says why.

## Open for MVP

Amount validation rules, a per-purchase due date different from the account default, editing or voiding a purchase after the fact.
