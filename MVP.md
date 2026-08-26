# MVP

The MVP is the first version a merchant (تاجر) and a customer (عميل) can rely on daily at the counter. The merchant extends the credit; سجّل records it, guards the limit, and handles the settlement; سجّل itself lends nothing. The [prototype](PROTOTYPE.md) is the UX reference: layout, wording, colours, and flow order carry over. What the MVP does is make real the things the prototype fakes.

## What carries over

RTL layout, amounts in ر.س. The screens in [index.html](index.html) keep their shape: the gold pay-day strip, the QR approval handshake, the limit block and the overdue lock, the settlement flow. What does not carry over is the demo scaffolding. The app-bar role toggle exists so one screen can play both phones ([tasks/001](tasks/001-auth-and-role.md)); the scan is a button, not a camera; a settings tool flips a customer overdue; the web checkout is previewed on the same device; reset is a page reload. The MVP has two real phones and a camera, so all of these go.

Two things the prototype fixes are now wrong rather than merely faked, and the review section below says why: the pay-day is the 27th on every screen, and the app is Arabic-only.

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

## What the business-model review changed

A review of the non-lending model settled a list of questions this document had left open, and reversed two of its cuts. The revenue side of the same list is in [business_model.md](business_model.md); the product side is here, and it overrides anything above that disagrees with it.

- Pay-day is weekly, on Tuesday. A month is too long for a merchant to wait for money he has already fronted. UC-19 keeps its place and changes its cadence: the due computation in [tasks/017](tasks/017-payday.md), the strips on every screen, and the reminders all move with it. The prototype still shows the 27th; it is the UX reference for everything except the date.
- The merchant's home screen is the QR code, so UC-16 comes back into scope, and the question [tasks/014](tasks/014-merchant-home-qr.md) left open is answered: scanning it starts an operation, and connects the customer first if they are not connected yet.
- There is no "add customer" button anywhere. One button, عملية جديدة, and the handshake of UC-08 happens inside it.
- An invoice is required to record an operation, so UC-11 comes back into scope. The optional dropzone of [tasks/009](tasks/009-invoice-attachment.md) becomes a required step, which makes the storage subsystem an MVP subsystem: capture, retention, preview, delete rights.
- The customer accepts terms and conditions once, before their first operation. Together with the per-operation approval this is the إقرار that secures the merchant's claim.
- Fees on an operation, transfer, payment, administrative, and the gateway's commission, are billed to the merchant. The customer pays nothing to settle.
- Merchant packages. Free: one payout transfer a month, in-app alerts, managing the customer's limit, the due-date mode, and a summary of the customer's commitment record. Paid: customer behavior analysis, a dashboard, reports, and WhatsApp and SMS alerts.
- Notifications split by channel, not by feature: in-app and email are free, WhatsApp and SMS are on the paid package ([tasks/010](tasks/010-notifications.md)).
- The merchant can set a goodwill discount for a customer who has fallen behind, to give them a way back.
- A customer can hold a balance and top it up, and gift cards exist. Both put money inside سجّل rather than passing it through, which is a licensing question before it is a build question; [business_model.md](business_model.md) lists it under risks, and it is not settled here.
- A cash refund is possible only on a pending operation whose money has not been collected.
- A customer who is badly late can schedule what they owe. Their operations stop until the schedule is honored.
- The engine underneath: the commitment-record algorithm, and detection of fraud and repeated operations.
- An admin console for سجّل: customer count, merchant count, live operations, defaults, and approving or rejecting a new store's registration. Every store is approved by hand.
- Five languages: Arabic, English, Urdu, Hindi and Bengali. The MVP is no longer Arabic-only. Five languages is five sets of copy to write, translate, review and keep in step, plus LTR layouts beside the RTL ones, and none of it is on the prototype's screens today.
- A user guide ships with the MVP, and it has to be readable by a shopkeeper who has never used an app like this.
- POS integration is after the MVP. When it lands it has to carry the invoice and its categories, so a customer can see what they bought; an amount alone adds nothing over typing.

## Decisions this document makes

The repo leaves these open. The MVP needs an answer, so here they are; overturning one is cheap now and expensive after build starts.

- OTP goes over SMS. The tasks say only "real OTP delivery".
- A payment link is single-use: consumed on the first payment, shown as paid when opened again. [tasks/015](tasks/015-web-checkout-and-whatsapp.md) poses the double-open question; this is the answer.
- A merchant can always share a payment link from their own WhatsApp, as in the prototype. Automated reminders ahead of Tuesday ([tasks/017](tasks/017-payday.md)) go out through the WhatsApp Business API with an approved template; template approval is an external dependency with its own lead time.
- Reminders are push, email, WhatsApp and SMS, the last two on the paid package ([tasks/010](tasks/010-notifications.md)). The earlier ruling that deferred SMS is superseded by the review above.
- A connection exists only after the handshake. A customer refuses by not showing the code, and an invited number that never signs up leaves nothing in the merchant's list ([tasks/006](tasks/006-connect-customer.md) asks whether a customer can refuse; this is the answer).
- Refunds of money already collected happen outside the app, with whatever the chosen gateway provides; disputes wait for the full release. The one in-app case is the cash refund the review added, on a pending operation whose money never moved.

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
| UC-08 connect a new customer | In, inside the new-operation flow |
| UC-09 customer dashboard and history | In |
| UC-10 settlement in the app | In |
| UC-11 invoice attachment | In, and required on every operation |
| UC-12 notifications | In |
| UC-13 limits and settings | In |
| UC-14 hide and show amounts | In |
| UC-15 transactions counter | In |
| UC-16 merchant QR on the home screen | In, as the merchant's home screen |
| UC-17 web checkout and WhatsApp link | In |
| UC-18 credit limit progress bar | In |
| UC-19 unified pay-day | In, weekly on Tuesday |

UC-11 and UC-16 were cut here, and the review put both back. The reasons for cutting them still stand as costs: UC-11 drags in a storage subsystem (retention, camera capture, PDF preview, delete rights), and UC-16 needed an answer for what a scan resolves to. The review paid for the first and answered the second, so both are in.

Beyond the POC's nineteen use cases, the review adds these to the MVP:

| Addition | Notes |
|---|---|
| Terms and conditions, accepted once | With the per-operation approval, this is the acknowledgment |
| Merchant packages, free and paid | Gating is a product surface, billing is [business_model.md](business_model.md)'s |
| Notification channels by package | In-app and email free, WhatsApp and SMS paid |
| Goodwill discount, set by the merchant | For a customer who has fallen behind |
| Customer balance and top-up | Blocked on the licensing question |
| Gift cards | Same block |
| Cash refund on a pending, uncollected operation | Nothing else is refundable in the app |
| Rescheduling for a badly late customer | Operations stop until the schedule is honored |
| Commitment-record algorithm | What a merchant sees of a customer they have not served is undecided |
| Fraud and repeated-operation detection | |
| Admin console | Counts, defaults, and store approval |
| Five languages | Arabic, English, Urdu, Hindi, Bengali |
| User guide | |

None of these have estimates yet, and several are larger than the row they sit in.

Smaller open items from the task files, ruled on here rather than left silent:

- In, with the rules set during design: amount validation ([tasks/003](tasks/003-new-purchase.md)).
- Deferred: search, sort, and transaction pagination ([tasks/002](tasks/002-merchant-dashboard.md)); a combined transaction list, export, and disputes ([tasks/007](tasks/007-customer-dashboard.md)); editing or voiding a recorded purchase ([tasks/003](tasks/003-new-purchase.md)), so until then a correction is a settlement or a new entry; per-purchase due dates ([tasks/003](tasks/003-new-purchase.md)), which would cut against the one pay-day; the audit trail of limit changes ([tasks/011](tasks/011-limits-and-settings.md)); persisting the masking choice and re-arming it in the background ([tasks/012](tasks/012-amount-visibility.md)); the period filter on the counter ([tasks/013](tasks/013-transactions-counter.md)).

## Out of the MVP

From the POC's own out-of-scope list ([POC.md](POC.md)), still out: multi-merchant staff accounts, and exports. Reporting is in, on the paid package. Language switching is in and then some: the MVP ships five languages, so the POC's Arabic-only rule is gone.

Also out, by judgment: lending, interest, or factoring in any form. The merchant carries the credit risk, as in the current design; [business_model.md](business_model.md) says why that line matters. The commitment record the review adds is not an exception to this. It is a record of how a customer paid this merchant, shown to that merchant; the moment it becomes a score sold or shown to others, it is credit information and a different regime applies.

## Open decisions

Stack questions, to be resolved in [TECH_STACK.md](TECH_STACK.md) before build starts:

- App stack. [PROTOTYPE.md](PROTOTYPE.md) relays the spec's suggestion of Flutter/Firebase; nothing is decided.
- Gateway: Moyasar or Tap. The constraints are fixed either way: مدى and Apple Pay in Saudi Arabia, webhooks, settlement to the merchant's account. Payout onboarding depends on this choice, so it cannot wait long.
- One app with both roles or two apps, and whether one account can hold both roles ([tasks/001](tasks/001-auth-and-role.md)).
- The Netlify deployment keeps serving the prototype as a demo; the hosted checkout page is a separate, real deployment.

Product questions, to settle during MVP design:

- Is the pay-day per merchant or per customer, and what does an operation recorded on Monday evening do ([tasks/017](tasks/017-payday.md)). The weekly cadence makes the second question sharper, not softer: with a month there was room to roll a late purchase forward, with a week there is a day.
- Whether a balance and gift cards ship at all, and if they do, whether the licensed gateway holds the money ([business_model.md](business_model.md)).
- What the commitment record shows a merchant who has never served that customer, which is where the record turns into credit information about a named person.
- What the goodwill discount may do: does it write off part of the debt, and who sees that it was written off.
- The criteria for approving a store in the admin console, and what a rejected merchant is told.
- Which of the five languages the user guide ships in, and whether support answers in all of them.
- Is the overdue override logged against the merchant, or does it need a second approver; does raising a limit mid-purchase need a second confirmation ([tasks/004](tasks/004-limit-and-overdue-guards.md)).
- Does changing a limit affect existing balances, and can a limit be set below the current balance, with how the bar reads when it is ([tasks/011](tasks/011-limits-and-settings.md), [tasks/016](tasks/016-credit-limit-progress.md)).
- May a merchant scan a code the customer has not opened ([tasks/005](tasks/005-qr-approval.md)).
- A data-protection pass on what the ledger stores and for how long, against the Saudi PDPL.

## Done when

- Two phones, two accounts: the merchant records a purchase, the customer approves by a camera-scanned QR, and both balances match. Both apps restart and the data is still there.
- OTP arrives by SMS on a real number; a wrong code fails; resends are limited.
- A settlement by مدى, Apple Pay, or card clears through the real gateway, the ledger updates on the webhook and not on the tap, and the money reaches the account the merchant onboarded.
- A customer without the app receives a WhatsApp link, pays on the hosted page, and the merchant's balance updates. The same link opened again shows paid and cannot pay twice.
- A debt left unpaid past Tuesday shows overdue on both sides with nobody touching anything, and the overdue lock fires on the next operation.
- An operation cannot be recorded without an invoice, and both sides can open it afterwards.
- A push notification for a purchase approval arrives with the app closed, and approving from it works.
- A number that has never used سجّل gets an invitation, and nothing appears in the merchant's list until the handshake completes.
- Proposal, to validate with the team: one merchant runs their counter on it for a month, four Tuesdays, without falling back to the paper دفتر.
