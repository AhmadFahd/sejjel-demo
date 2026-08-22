# MVP

The MVP is the first version a merchant (تاجر) and a customer (عميل) can rely on daily at the counter. The merchant extends the credit; سجّل records it, guards the limit, and handles the settlement; سجّل itself lends nothing. The [prototype](PROTOTYPE.md) is the UX reference: layout, wording, colours, and flow order carry over. What the MVP does is make real the things the prototype fakes.

## What carries over

Arabic-only, RTL, amounts in ر.س. The screens in [index.html](index.html) keep their shape: the gold pay-day strip, the QR approval handshake, the limit block and the overdue lock, the settlement flow. Two kinds of prototype content do not carry over:

- The demo devices. The app-bar role toggle exists so one screen can play both phones ([tasks/001](tasks/001-auth-and-role.md)); the scan is a button, not a camera; a settings tool flips a customer overdue; the web checkout is previewed on the same device; reset is a page reload. The MVP has two real phones and a camera, so all of these go.
- Elements of the two deferred use cases below: the invoice dropzone and paperclip tags, and the merchant home QR card, come off the reference screens until their use cases land.

## What the MVP builds

Each of these replaces something the prototype fakes. The fakes are catalogued in [PROTOTYPE.md](PROTOTYPE.md) and in the task files' "Open for MVP" sections.

- Accounts and OTP: real delivery, wrong codes fail, resend and retry limits, a session that survives a restart ([tasks/001](tasks/001-auth-and-role.md)).
- A server-side ledger as the single source of truth. The prototype mirrors both roles in one page's memory; the MVP syncs two devices and keeps data across sessions and reinstalls.
- Payments: one gateway (Moyasar or Tap, undecided, see [TECH_STACK.md](TECH_STACK.md)) with مدى, Apple Pay, and card; webhook-confirmed, with failed and pending states and receipts; settlement to the merchant's account ([tasks/008](tasks/008-settlement.md)).
- Merchant payout onboarding: the merchant tells سجّل where settlements land and verifies it. No prototype screen covers this, and it probably includes the gateway's own merchant onboarding; how heavy it is depends on the gateway choice.
- The web checkout: a hosted page on a real domain, server-generated payment links with expiry ([tasks/015](tasks/015-web-checkout-and-whatsapp.md)).
- QR approval: signed payloads, camera scanning on the merchant side, and defined recovery when the network drops between approval and apply ([tasks/005](tasks/005-qr-approval.md)).
- Push notifications outside the app, with purchase approvals actionable from the notification ([tasks/010](tasks/010-notifications.md)).
- A real clock: due, due soon, and overdue computed from dates. The prototype's clock is frozen at 18 August 2026, and its amber "due soon" style has nothing computing it ([tasks/002](tasks/002-merchant-dashboard.md)).
- An invitation path for a number that has never used سجّل ([tasks/006](tasks/006-connect-customer.md)).

## Decisions this document makes

The repo leaves these open. The MVP needs an answer, so here they are; overturning one is cheap now and expensive after build starts.

- OTP goes over SMS. The tasks say only "real OTP delivery".
- A payment link is single-use: consumed on the first payment, shown as paid when opened again. [tasks/015](tasks/015-web-checkout-and-whatsapp.md) poses the double-open question; this is the answer.
- A merchant can always share a payment link from their own WhatsApp, as in the prototype. Automated reminders leading up to the 27th ([tasks/017](tasks/017-payday.md)) go out through the WhatsApp Business API with an approved template; template approval is an external dependency with its own lead time.
- Reminders are push and WhatsApp; SMS fallback is deferred ([tasks/010](tasks/010-notifications.md)).
- A connection exists only after the handshake. A customer refuses by not showing the code, and an invited number that never signs up leaves nothing in the merchant's list ([tasks/006](tasks/006-connect-customer.md) asks whether a customer can refuse; this is the answer).
- Refunds happen outside the app, with whatever the chosen gateway provides. In-app refund and dispute flows wait for the full release.

## Scope by use case

| Use case | MVP |
|---|---|
| UC-01 sign in by mobile and OTP, pick a role | In |
| UC-02 merchant dashboard | In |
| UC-03 merchant opens a customer account | In |
| UC-04 new purchase on credit | In |
| UC-05 limit breach block | In |
| UC-06 overdue warning and override | In |
| UC-07 QR approval | In |
| UC-08 connect a new customer | In |
| UC-09 customer dashboard and history | In |
| UC-10 settlement in the app | In |
| UC-11 invoice attachment | Deferred |
| UC-12 notifications | In |
| UC-13 limits and settings | In |
| UC-14 hide and show amounts | In |
| UC-15 transactions counter | In |
| UC-16 merchant QR on the home screen | Deferred |
| UC-17 web checkout and WhatsApp link | In |
| UC-18 credit limit progress bar | In |
| UC-19 unified pay-day | In |

Display features cost little to carry, since the prototype already defines them; the cuts are where a real subsystem or unresolved semantics hide.

- UC-11 is a storage subsystem: retention, camera capture, PDF preview, delete rights ([tasks/009](tasks/009-invoice-attachment.md)). Nothing depends on it and the field is already optional on the purchase screen.
- UC-16 is display-only even in the prototype, and what a scan of it resolves to is undecided ([tasks/014](tasks/014-merchant-home-qr.md)). A code that does nothing when scanned is worse than no code.

Both move to [FULL_RELEASE.md](FULL_RELEASE.md); their prototype UX is the reference when they land.

Smaller open items from the task files, ruled on here rather than left silent:

- In, with the rules set during design: amount validation ([tasks/003](tasks/003-new-purchase.md)).
- Deferred: search, sort, and transaction pagination ([tasks/002](tasks/002-merchant-dashboard.md)); a combined transaction list, export, and disputes ([tasks/007](tasks/007-customer-dashboard.md)); editing or voiding a recorded purchase ([tasks/003](tasks/003-new-purchase.md)), so until then a correction is a settlement or a new entry; per-purchase due dates ([tasks/003](tasks/003-new-purchase.md)), which would cut against the one pay-day; the audit trail of limit changes ([tasks/011](tasks/011-limits-and-settings.md)); persisting the masking choice and re-arming it in the background ([tasks/012](tasks/012-amount-visibility.md)); the period filter on the counter ([tasks/013](tasks/013-transactions-counter.md)).

## Out of the MVP

From the POC's own out-of-scope list ([POC.md](POC.md)), still out: multi-merchant staff accounts, reporting, exports, Arabic/English switching. The MVP stays Arabic-only, RTL.

Also out, by judgment: lending, scoring, interest, or factoring in any form. The merchant carries the credit risk, as in the current design; [business_model.md](business_model.md) says why that line matters.

## Open decisions

Stack questions, to be resolved in [TECH_STACK.md](TECH_STACK.md) before build starts:

- App stack. [PROTOTYPE.md](PROTOTYPE.md) relays the spec's suggestion of Flutter/Firebase; nothing is decided.
- Gateway: Moyasar or Tap. The constraints are fixed either way: مدى and Apple Pay in Saudi Arabia, webhooks, settlement to the merchant's account. Payout onboarding depends on this choice, so it cannot wait long.
- One app with both roles or two apps, and whether one account can hold both roles ([tasks/001](tasks/001-auth-and-role.md)).
- The Netlify deployment keeps serving the prototype as a demo; the hosted checkout page is a separate, real deployment.

Product questions, to settle during MVP design:

- Is the pay-day per merchant or per customer, and what does a purchase made on the 26th do ([tasks/017](tasks/017-payday.md)).
- Is the overdue override logged against the merchant, or does it need a second approver; does raising a limit mid-purchase need a second confirmation ([tasks/004](tasks/004-limit-and-overdue-guards.md)).
- Does changing a limit affect existing balances, and can a limit be set below the current balance, with how the bar reads when it is ([tasks/011](tasks/011-limits-and-settings.md), [tasks/016](tasks/016-credit-limit-progress.md)).
- May a merchant scan a code the customer has not opened ([tasks/005](tasks/005-qr-approval.md)).
- A data-protection pass on what the ledger stores and for how long, against the Saudi PDPL.

## Done when

- Two phones, two accounts: the merchant records a purchase, the customer approves by a camera-scanned QR, and both balances match. Both apps restart and the data is still there.
- OTP arrives by SMS on a real number; a wrong code fails; resends are limited.
- A settlement by مدى, Apple Pay, or card clears through the real gateway, the ledger updates on the webhook and not on the tap, and the money reaches the account the merchant onboarded.
- A customer without the app receives a WhatsApp link, pays on the hosted page, and the merchant's balance updates. The same link opened again shows paid and cannot pay twice.
- A debt left unpaid past the 27th shows overdue on both sides with nobody touching anything, and the overdue lock fires on the next purchase attempt.
- A push notification for a purchase approval arrives with the app closed, and approving from it works.
- A number that has never used سجّل gets an invitation, and nothing appears in the merchant's list until the handshake completes.
- Proposal, to validate with the team: one merchant runs their counter on it through a full cycle that includes a 27th, without falling back to the paper دفتر.
