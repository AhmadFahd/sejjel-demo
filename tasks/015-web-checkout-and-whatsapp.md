# 015: Web checkout and the WhatsApp payment link

Use case: UC-17. Status: done in prototype, payment is simulated.

Two ways to settle, so a merchant can bring in customers who have not installed anything:

- In the app, for registered customers: Apple Pay, مدى, or a card (task 008).
- Outside the app: a payment link sent over WhatsApp that opens a light web page.

## The link

A "إرسال رابط سداد بالواتساب" button appears on two screens:

- New purchase, once a customer and an amount are set. The message asks for immediate payment of that purchase.
- The customer's account view in the merchant app, whenever there is a balance. The message is a reminder of the outstanding amount and names the unified pay-day.

Tapping it opens a sheet with the message as WhatsApp would show it, addressed to the customer's number in international form. From there:

- "فتح واتساب بالرسالة الجاهزة" opens `wa.me` with the text prefilled.
- "معاينة الرابط كما يفتحه العميل" jumps to the web checkout page, so the whole path can be demoed on one device.

## The web page

Screens `w-pay` and `w-success`, drawn as a browser page rather than an app screen: a URL bar on `pay.sajjel.sa/r/XXXXXXXX`, the merchant and amount, the pay-day strip, then Apple Pay, مدى, and card. They have no app bar and no bottom nav — the customer is in a browser, not in Sajjel.

Effects on payment:

- Reminder link: the balance drops, a `دفعة عبر رابط ويب` row is added, and the merchant gets a notification naming the WhatsApp link.
- Purchase link: nothing is owed, so no ledger row; the merchant is notified of an immediate payment.

## Acceptance

- A reminder paid on the web page clears on the merchant side without the customer opening the app.
- The web screens show no app chrome.

## Open for MVP

Real link generation and expiry, a real WhatsApp Business template, receipts by link, and what happens when the same link is opened twice.
