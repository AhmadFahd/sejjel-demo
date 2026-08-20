# 008: Settlement

Use case: UC-10. Status: done in prototype, payment is simulated.

## Flow

1. Customer taps سداد الآن and picks full or a custom amount from a segmented control.
2. Picks Apple Pay or Visa.
3. A staged overlay simulates the gateway in about 2.2 seconds, including a webhook step.
4. Success screen: amount paid, remaining balance, method, and a reference in the form PAY-XXXXXXXX.

## Effects

- The merchant's copy of the balance updates immediately.
- Overdue clears when the balance reaches zero.
- The merchant gets a notification the moment the payment lands.

## Acceptance

- Partial payment leaves the right remainder on both sides.
- Full payment moves the customer to مسدد.

## Open for MVP

A real gateway, refunds, failed and pending payments, receipts, and settlement to the merchant's account. The POC spec named Moyasar or Tap as candidates; nothing is decided. See [../TECH_STACK.md](../TECH_STACK.md).
