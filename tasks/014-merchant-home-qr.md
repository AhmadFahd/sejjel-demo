# 014: Merchant QR on the home screen

Use case: UC-16. Status: done in prototype.

The merchant's own code sits in a fixed card at the top of the dashboard, above the stats, so a customer can scan it from their phone straight away rather than being walked to a sub-screen. The card shows the code, a one-line explanation, and the URI `sajjel://m/rayan`.

The canvas is drawn once and the `S.qrMerchDrawn` flag keeps re-renders from redrawing it.

## Acceptance

- The code is visible on the dashboard with no navigation.
- It survives dashboard re-renders (new purchase, payment received, masking toggle).

## Open for MVP

What the scan resolves to on the customer's side: opening an existing account, starting a connection request, or starting a purchase. The prototype shows the card only; the merchant-side scanner still drives the flows in tasks 003 and 006.
