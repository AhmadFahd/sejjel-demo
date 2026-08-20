# 005: QR approval handshake

Use case: UC-07. Status: done in prototype.

Every purchase needs the customer's consent. Consent is a QR the customer shows and the merchant scans.

## Flow

1. Merchant submits the purchase and waits on a pending screen.
2. Customer gets an actionable notification, opens the approval screen: amount, description, balance after, and the invoice link if one is attached.
3. The screen draws a QR generated from a one-time token and starts a 2:00 countdown. It pulses red under 20 seconds.
4. On expiry an overlay covers the code with a regenerate button that issues a new token.
5. Merchant scans. The balance is applied, the transaction is added, the due date is recomputed from the term, and the merchant gets a summary.

## Guards on the scan

- No pending request.
- The customer has not opened the QR yet.
- The token has expired.

Each of the three fails with its own message.

## Acceptance

- The code is deterministic for a given token, so the same request always draws the same code.
- Cancelling the request clears the customer's notification.
- Timers keep running when you navigate away, so a code can expire in the background.

## Open for MVP

Real QR payload and signing, whether the merchant should be able to scan a code the customer has not opened, and what happens on a network drop between approval and apply.
