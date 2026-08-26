# Business model

سجّل lends no money. The تاجر extends the tab; the app records it, guards the limit, and makes it easy to settle. Everything falls due weekly, on Tuesday, and payment lands whenever the customer pays. That framing decides most of what follows: the merchant is the customer of the business, and the app's legal position depends on staying a ledger and a settlement rail, not becoming a lender.

The prototype's one monthly pay-day, the 27th ([UC-19](POC.md)), is superseded here. Merchants said a month is too long to wait for their money, so the cycle is a week and the day is Tuesday. The product side of that decision, and of the others this review settled, is in [MVP.md](MVP.md).

This is a plan by a pre-revenue project with zero users. Every fee and every tier below is a proposal to test, not a decision. External facts carry named sources, listed at the end; several were reachable only through search summaries, so every figure needs confirming on the live page before it goes into a projection.

An Arabic version is kept in [business_model_ar.md](business_model_ar.md). This English file is the source of truth: any change here must be carried into the Arabic file in the same commit.

## Who pays

The merchant pays. The عميل pays nothing, ever, to settle a debt.

A fee on repayment would punish the one behavior the app exists to produce. The customer did not pick سجّل; the merchant did. A surcharge on the WhatsApp link (UC-17) would send the customer back to cash at the counter, and the payments line would die with it. So the rule is absolute: settling a debt through سجّل costs the payer zero, and any gateway cost on settlement is the merchant's cost or ours.

The fee is more than the payments margin. Transfer fees, payment fees, an administrative fee on the operation, and the gateway's own commission all sit on the merchant's side of that line. The customer sees one number, which is what they owe.

## Who it is for

The merchant side is retail that already runs a tab: groceries, laundries, cafeterias, small shops in general. The customer side is whoever walks in, and in that segment the counter is not monolingual. Arabic, English, Urdu, Hindi and Bengali are all counter languages, and the MVP ships all five ([MVP.md](MVP.md)). That is the team's read of the segment rather than a surveyed number, and it is worth checking in the pilot, because five languages is real translation cost carried before the first riyal.

## A record, not credit

سجّل underwrites nobody. The merchant decides who gets a tab and how large it is, and what they decide on is a rating and a commitment record the app keeps: how this customer has paid before. That is the guarantee on offer, and it is the whole of it.

Three things make the record worth trusting. The invoice, because recording an operation requires one and there is no bare amount typed into a field ([tasks/009](tasks/009-invoice-attachment.md), pulled into the MVP by [MVP.md](MVP.md)). The acknowledgment, because the customer accepts the terms once and then approves each operation, and that approval is what secures the merchant's claim if the debt is ever argued. And the formal ledger: a grocery's paper دفتر is a private note, while the same tab in سجّل is dated, invoiced and acknowledged. Turning shop ledgers into records that hold up is the product, stated plainly.

Whether an in-app approval carries the weight of an إقرار before a Saudi court is a question for counsel. The design assumes it does, and the assumption is load-bearing.

Behind the record sits the engine the MVP has to build: the scoring algorithm, duplicate and fraud detection on operations, and a path for a customer who has fallen far behind to schedule what they owe, with their operations stopped until the schedule is honored ([MVP.md](MVP.md)). None of the lines below work if the score is not worth reading.

For the customer the pitch is the mirror of it: settlement made easy, and a record that follows them. Not credit, and nothing سجّل lends.

## The wedge: a free ledger

The core stays free: recording purchases (UC-04), the limit block (UC-05), limits and overrides (UC-13), the QR handshake (UC-07, UC-08), settlement in the app (UC-10), the payment link shared from the merchant's own WhatsApp (UC-17), the weekly Tuesday everywhere (UC-19).

The comparables are blunt about what a free ledger earns on its own. Khatabook and OkCredit built the free-khata category in India; OkCredit's lifetime numbers are roughly Rs 9 crore of revenue against Rs 428 crore of losses (Entrackr, Dec 2023; a crore is ten million), and The Ken's post-mortem of the category concludes that kirana-type merchants would not pay for bookkeeping software and that the monetization which survived was credit intermediation. By late 2023 Khatabook itself was framed around a loan-book target (Entrackr, Sept 2023).

The free ledger is a funnel. What it feeds, in the order the taps can open:

## Line 1: a payments margin on settlement

A fee, billed to the merchant, on debt settled through the app (UC-10) or the web link (UC-17). Settlement itself goes gateway-direct to the merchant's account, so سجّل never holds the money. Netting our fee from the payout would need split settlement from the gateway and the licensing question below answered first, so billing comes first.

This is the first line because the prototype already has the whole flow, and the fee can turn on with the first real gateway ([MVP.md](MVP.md)).

Gateway economics, from the sources at the end:

- mada scheme fees since 1 Sept 2023 are 1% of the transaction, capped at SAR 200, Apple Pay over mada included (Tap Payments' blog; confirm against mada's own schedule).
- Moyasar, one of the two gateways the POC spec named ([tasks/008](tasks/008-settlement.md)), is quoted at 1.75% + SAR 1 for مدى and 2.2% + SAR 1 for Visa/Mastercard (GulfSaaSReview's 2026 comparison; moyasar.com itself was unreachable from the research environment).
- Tap and HyperPay are quoted higher on cards, HyperPay with setup and monthly fees on top (Raghdan's 2025 gateway guide; comparison-site figures, not the gateways' own lists).

Whatever سجّل charges sits on top of the gateway's cut. مدى leaves headroom; cards leave little. So steering payers toward مدى and Apple Pay is the margin lever, and the مدى share of link payments is one of the first numbers to watch in a pilot.

What this line needs from the product: the gateway, webhooks, receipts, settlement to the merchant's account, single-use links ([tasks/008](tasks/008-settlement.md) and [tasks/015](tasks/015-web-checkout-and-whatsapp.md) list these as open for the MVP), plus reconciliation, which is this document's addition. All of it is the MVP's job ([MVP.md](MVP.md)).

What it needs from regulation: staying out of the money flow. SAMA's payment services regime licenses those who hold or move customer funds (the PI and EMI classes in the SAMA rulebook). If the licensed gateway settles directly to the merchant and سجّل only bills a fee, سجّل may stay outside that perimeter. Whether it does is for KSA counsel, not for this document.

## Line 2: a paid merchant tier

Second because it needs merchants willing to pay, and the comparables warn it stays small: both Khatabook and OkCredit sell premium tiers, and The Ken's verdict on the category credits lending, not subscriptions, with whatever worked. Treat this line as a complement to line 1, not the plan.

Free forever: everything in the wedge, one merchant, unlimited customers, unlimited entries, links shared from the merchant's own WhatsApp. Alerts inside the app and by email, the customer's limit and its management, the due-date mode, a summary of the customer's commitment record, and one payout transfer a month. Moving any of it behind a paywall later would burn the trust the funnel runs on.

Behind the paywall, as proposals to test:

- Customer behavior analysis, a merchant dashboard, and reports. This is the tier's real argument: the merchant carries the credit risk, so the merchant is the one who wants to know who repays.
- Alerts over WhatsApp and SMS. In the app and by email they stay free. WhatsApp and SMS cost money per message on Meta's and the operator's side (verify current WhatsApp Business pricing; it changed in 2025), so a free allowance with paid bundles above it meters a new cost rather than paywalling an old feature.
- Automated reminders ahead of Tuesday, sent by سجّل rather than from the merchant's own phone.
- Staff accounts, exports, and more frequent payout transfers than the free monthly one: all outside the POC's scope today, all natural paid additions.

No price points yet; the first numbers come out of pilot conversations with real merchants, framed as starting proposals.

## Later lines: full release or beyond

### Receivables financing, by referral

The ledger produces underwriting data nobody has for a micro-merchant: receivables aging, repayment behavior against the weekly Tuesday, customer concentration. SAMA-licensed platforms already lend to Saudi SMEs on adjacent data: Lendo (invoice financing), Forus (financing sized on POS transaction volume, the closest analogue to lending against a tab ledger), Tameed, Manafa (IBS Intelligence's overview). The SME Bank has allocated SAR 240M through Manafa, Lendo and Tameed for tickets of SAR 50,000 to 1M (Arab News).

The workable shape is referral: the licensed platform holds the license and the loan book, سجّل supplies data and distribution, and earns a commission. That is where both Indian comparables ended up, Khatabook by strategy and OkCredit after regulation closed its own P2P product (Entrackr). Lending on our own book is off the table; the BNPL rules alone (below) say why. The own-book variant is worked out separately in [business_model_loan.md](business_model_loan.md), and stays off the table here.

Two caveats. Micro-grocery tickets may sit below those platforms' current minimums, so the segment fit is unproven. And SIMAH, the national credit bureau, could one day make tab repayment count toward a customer's credit file, but access terms for a company like سجّل are not public.

### ZATCA e-invoicing

Fatoora Phase 2 keeps widening: Wave 24 pulls in VAT-registered businesses above SAR 375,000 turnover with a 30 June 2026 deadline, and Wave 25 halves the threshold to SAR 187,500 with a 1 Feb 2027 deadline (VATupdate). That is deadline-driven pain for part of exactly our merchant segment, so a compliant simplified invoice per entry is a plausible paid hook. It needs certified Fatoora integration, which is real compliance engineering in a field already full of ZATCA vendors: [full release](FULL_RELEASE.md) at the earliest, and that document is still a stub.

### POS integration

The record's weak point is that a person types it. Reading operations from the shop's own point of sale removes the typing and brings the invoice with it, down to the line items, so the customer sees the goods behind the amount. It is also the natural distribution deal, since the POS vendor already has the merchants. Nothing here before the [full release](FULL_RELEASE.md), and the integration is only worth building if it carries the invoice and its categories; an amount without them is what the manual flow already gives.

### Not building

- Storefronts. Khatabook shut MyStore in Nov 2021 and OkCredit shut OkShop in April 2022 (StartupTalky, Entrackr). The category tried it twice and closed it twice.
- Ads. The research found no comparable earning meaningful ad revenue, and ads sit badly in an app whose product is trust around debt.
- Float. Holding collected funds raises the PI/EMI licensing question and safeguarding rules; gateway-direct settlement avoids both.

## Pricing philosophy

- The debtor pays zero to settle. Non-negotiable.
- The payments fee is priced per rail, above gateway cost; the مدى price can sit below the card price to steer volume.
- Nothing free today becomes paid later; paid things are new things.

## Distribution and its limits

The prototype already carries loops that spread the ledger to customers:

- The WhatsApp payment link (UC-17) reaches a customer who has installed nothing. In the prototype it goes from the merchant's own WhatsApp, which costs nobody anything.
- Connecting a new customer is the same in-person QR handshake that approves a purchase (UC-08), so the counter itself onboards customers. There is no separate "add customer" step in the MVP: the merchant's home screen is the QR code (UC-16, back in scope), and a customer who is not connected yet is connected by the same scan that starts an operation.
- One pay-day (UC-19) gives the app a reason to be opened on a known day, and weekly gives it four times the reasons that monthly did.

These loops acquire customers of a merchant already on سجّل. Nothing here acquires merchants, and the merchant is the one who pays. At this stage merchant acquisition is direct work: walking into shops, running pilots, asking for introductions. Merchants may refer each other once the thing is useful; we'll see. This document does not pretend a channel exists before the pilot finds one.

## What it costs before it earns

Until line 1 clears zero, the model runs on cost with no revenue against it: hosting and the gateway integration, Meta's fees on templated reminders, SMS OTP delivery, support, translation and upkeep of five languages, a written user guide, hand-approval of every store that applies, and the KSA counsel opinion this document requires before the first riyal of revenue. No numbers here; they belong in a budget once the stack and gateway are chosen ([TECH_STACK.md](TECH_STACK.md)). What funds the gap is the owners' question.

## Risks that could kill the model

- SAMA reclassification. The BNPL rules (Dec 2023) require a license, minimum capital of SAR 5M, and cap outstanding finance at 20x capital and reserves for companies that provide the financing (SAMA rulebook; the rulebook text was unreachable from the research environment, so verify the articles). سجّل's design has the merchant providing the credit, but Bird & Bird's 2026 note on SAMA's regulatory perimeter warns that adding payments, merchant settlement, or deferred-payment arrangements can pull a platform in anyway, and the Finance Companies Control Law reaches deferred repayment of debt broadly. "The merchant lends, not us" is a design, not a safe harbor. Watch: a counsel opinion before the first riyal of revenue, and any SAMA guidance touching ledger or tab platforms.
- Gateway minimum economics. If micro-merchants cannot clear gateway onboarding, or fixed per-transaction fees eat the margin on small settlements, line 1 never clears zero. Watch: effective fee minus gateway cost per rail, from the first live month.
- Merchants stay on paper. The paper دفتر is free, offline, and has worked for generations. Watch: pilot merchants still recording after a month, and the share of their tabs that goes through سجّل rather than beside it.
- WhatsApp alone is good enough. A merchant can text "عليك 800" without us. The ledger, the limit, and pay-inside-the-link have to beat that text. Watch: whether customers pay through the link or keep handing over cash.
- Holding money. Three decisions from the MVP review put funds inside سجّل instead of passing them through: a customer balance the customer can top up, gift cards, and a payout transfer the free tier rates at once a month. Stored value and scheduled payouts are exactly the PI/EMI questions gateway-direct settlement was chosen to avoid. Whether they ship at all, or ship with the licensed gateway holding the balance, is a counsel question before it is a build question.
- The record leaving the shop that wrote it. A commitment record only its own merchant can see is one thing; a score readable by a merchant who has never served that customer is credit information about a named person, and the PDPL and the Saudi credit-information regime both bear on it. Watch: what the scoring engine exposes, and to whom.
- Weekly settlement multiplies transactions. A month's tab settled once carries one gateway fee; the same tab settled every Tuesday carries four, and the fixed riyal per transaction is charged four times. On small tabs that can invert the margin. Watch: effective margin per settlement in the first live month, at the weekly cadence.
- Collection conduct. SAMA's Debt Collection Regulations and Procedures for Individual Customers (2018) bind banks and finance companies: call caps, working hours, documented communication. On their face they do not bind a merchant chasing his own tab, but they define the norms SAMA expects, and automated reminders should be designed inside them from the MVP, because if سجّل is ever deemed a regulated collector they bind directly.

## Validate before any contract

- Willingness to pay at all: does any merchant accept any fee on settlement or any subscription. The Indian record says no for bookkeeping alone; KSA is untested.
- Settlement share through the app. If pilots record debts in سجّل but collect in cash, line 1 is zero at any price.
- مدى share of link payments, since the margin thesis leans on it.
- Gateway prices, confirmed on Moyasar's and Tap's live pages.
- Weekly Tuesday, from both sides. The month was wrong for merchants; a week is a proposal, and the customer paid monthly is the one it may not fit.
- The mandatory invoice. It is the record's spine and also the slowest step at the counter. If merchants skip it, they are skipping the product.
- Whether analysis and reports are what a grocery pays for, or whether the paid tier is really just the WhatsApp alerts.
- The empty field. The research surfaced no Saudi or GCC incumbent doing merchant-tab ledgers, but an Arabic app-store sweep was not done. Treat "no local competitor" as provisional until someone does the sweep.

## Sources

Consulted August 2026. Several pages were reachable only through search summaries from the research environment; confirm figures on the live page before relying on them.

- Entrackr on OkCredit's financials (Dec 2023): https://entrackr.com/2023/12/okcredit-lost-rs-428-cr-to-earn-rs-9-cr-since-incorporation/
- Entrackr on Khatabook's restructuring and loan-book target (Sept 2023): https://entrackr.com/2023/09/peak-xv-backed-khatabook-lays-off-over-40-employees/
- StartupTalky on Khatabook's business model, revenue lines, and the MyStore shutdown: https://startuptalky.com/khatabook-business-model/
- The Ken on why the kiranatech category stalled: https://the-ken.com/story/why-khatabook-okcredits-kiranatech-failed-to-fly-off-the-shelves/
- Tap Payments' blog on the revised mada fees: https://blog.tap.company/new-mada-fees-saudi/
- GulfSaaSReview's Saudi payment gateway fee comparison (2026): https://gulfsaasreview.com/article/payment-gateway-fees-saudi-arabia-2026
- Raghdan's Saudi payment gateway guide (2025): https://raghdan.sa/en/news/payment-gateways-in-saudi-arabia-guide-2025-requirements-fees-registration-steps-and-comprehensive-comparison/
- SAMA rulebook, BNPL rules: https://rulebook.sama.gov.sa/en/rules-regulating-buy-now-pay-later-bnpl-companies-0
- SAMA rulebook, payment service provider licensing: https://rulebook.sama.gov.sa/en/guidelines-apply-payment-service-providers-license
- SAMA rulebook, debt collection regulations (2018): https://rulebook.sama.gov.sa/en/debt-collection-regulations-and-procedures-individual-customers-0
- SAMA rulebook, Finance Companies Control Law: https://rulebook.sama.gov.sa/en/finance-companies-control-law
- Bird & Bird on the SAMA/CMA regulatory perimeter (2026): https://www.twobirds.com/en/insights/2026/saudi-arabia/saudi-financial-services-understanding-the-regulatory-perimeter-of-sama-and-the-cma
- IBS Intelligence on Saudi P2P SME lending platforms: https://ibsintelligence.com/ibsi-news/3-peer-to-peer-lending-platforms-empowering-smes-in-saudi-arabia/
- Arab News on SME Bank allocations through Manafa, Lendo and Tameed: https://www.arabnews.com/node/2595556/business-economy
- VATupdate on ZATCA e-invoicing Wave 25: https://www.vatupdate.com/2026/07/27/zatca-announces-wave-25-of-e-invoicing-threshold-halved-to-sar-187500-integration-deadline-1-february-2027/
