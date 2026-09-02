# Business model: the lending variant

[business_model.md](business_model.md) keeps سجّل out of the money: the تاجر extends the tab, the app records and settles it, and own-book lending is off the table. This document is the worked-out version of the path that was taken off the table, for if the owners ever choose it: سجّل itself finances the purchase, BNPL-style. It stands beside the ledger model without replacing it, and nothing in it changes the current stage, which is an interactive prototype with no backend, no users, and no revenue ([POC.md](POC.md)).

An Arabic version is kept in [business_model_loan_ar.md](business_model_loan_ar.md). This English file is the source of truth: any change here must be carried into the Arabic file in the same commit.

The same honesty rule applies as in the ledger document, with one addition. Every regulatory claim below says where it came from, and the section on SAMA says plainly what could and could not be read.

## The flip

The entry itself stays what it is: the merchant records the purchase (UC-04), the customer approves it (UC-07), everything falls due on the 27th (UC-19). What changes is who is owed, and with it the counter's legal shape. In the ledger model the entry means "the customer owes the merchant." In this model سجّل pays the merchant for the basket, owns the receivable, carries the default risk, and the customer's settlement on the 27th (UC-10, UC-17) repays سجّل, not the shop. One approval at the counter becomes a regulated financing transaction, which forces real changes to the flow ("What actually changes at the counter", below), and سجّل becomes a regulated financer instead of a software vendor.

## What the merchant is buying

In the ledger model the merchant gets bookkeeping for free and waits until the 27th, hoping the customer pays. In this model the merchant gets cash now and zero default risk: سجّل settles the basket, and if the customer never pays, that is سجّل's loss. That is a different product, and it is what a merchant discount fee, deducted from what سجّل pays the merchant, buys. The licensed players examined here (Tabby, Tamara) run on this fee, because the consumer side is legally near-zero-revenue (next section). Neither publishes a rate card; third-party analyses put Tabby's discount at roughly 3 to 7 percent of transaction value, varying by category, with grocery negotiated lower because grocery margins are thin. Those are analyst estimates of unknown provenance, and the grocery caveat cuts directly against this model's segment.

## The regulatory ground, and what could be read

The two primary sources for this document are SAMA rulebook pages:

- https://rulebook.sama.gov.sa/en/buy-now-pay-later-bnpl
- https://rulebook.sama.gov.sa/en/rules-regulating-consumer-microfinance-companies-0

The first is the same instrument [business_model.md](business_model.md) cites at rulebook.sama.gov.sa/en/rules-regulating-buy-now-pay-later-bnpl-companies-0: one set of rules, two rulebook URLs.

Both pages were unreachable from the research environment; the rulebook domain is blocked, along with sama.gov.sa and most Saudi news and law-firm sites. Nothing below is a quote from the rulebook. What was actually read: the full official English text of the Rules Regulating Buy-Now-Pay-Later Companies (November 2023 issue, Articles 1 to 31), fetched as a PDF from a mirror on Argaam's file store, with pages 9 and 10 (Articles 18 to 22) verified against page images. Claims cited to "BNPL Rules, Art. N" come from that PDF. It predates later amendments, which are known only from search-result text. The consumer microfinance side rests entirely on search-result text, no primary document at all. Every article number and figure needs verifying against the live rulebook by KSA counsel before any of this is treated as settled.

## Route 1: a BNPL license

The BNPL Rules define the activity as "a type of financing that allows a consumer to purchase goods or services without a term cost payable by the consumer" (BNPL Rules, Art. 1). That is this model almost verbatim: سجّل finances the consumer's purchase of goods from a store and the consumer pays no financing cost. Art. 3 prohibits carrying out the activity without a SAMA license. What the license costs and constrains, from the fetched text:

- A joint stock company with minimum capital of SAR 5,000,000, adjustable by SAMA (Arts. 1, 5). A company under establishment posts an irrevocable bank guarantee equal to the minimum capital (Art. 4).
- Licensing runs application, completeness review, initial approval within 60 working days of completeness, then up to 6 months (extendable once) to establish, licensing visits, and a 5-year renewable license (Arts. 7 to 10).
- Per-consumer cap: SAR 5,000 total outstanding in the issued text (Art. 22.1), raised to SAR 10,000 by a SAMA circular dated 24 December 2025 per search-result text of the rulebook's Article 22 page. A grocery tab sits comfortably inside either number. A carve-out reported in search snippets exempts financing up to SAR 2,000 from the Responsible Lending deductible ratios, which would matter for customers with no credit record.
- At most 12 installments (Art. 22.2). One payment on the 27th fits trivially.
- No fees to the consumer, of any kind, owed to the company, the store, or a third party; the only exceptions are delay penalties and collection fees as the Debt Collection Regulations allow (Art. 20.1). The debtor-pays-zero rule from [business_model.md](business_model.md) survives this route as law, with one decision left to make on delay penalties, made below.
- Collection through electronic channels only; requesting cash is prohibited (Art. 22.3). A customer could not pay off a سجّل-owned receivable in cash at the counter. The app's gateway settlement (UC-10) and web link (UC-17) are already the compliant shape.
- Credit checks with the customer's consent, registration and continuous updating of their file at a licensed credit-information company (SIMAH being the consumer bureau [business_model.md](business_model.md) already names), a documented creditworthiness method, identity verification, and loss provisioning under international accounting standards (Art. 19).
- Per-store contracts with a stated pricing structure (Art. 27). The fetched text sets no cap on the merchant fee; whether any other instrument caps it was not checked. The company must obligate stores not to pass any fee to the consumer and must monitor them for it (Art. 19.7). For سجّل that means papering and policing every merchant.
- Total outstanding finance capped at 20 times capital and reserves absent a SAMA non-objection (Art. 22.4); no funding from unlicensed financiers without non-objection (Art. 22.5); no disposal of financing assets or rights arising from them without non-objection (Art. 28.3).
- Saudization at 50 percent of staff at launch, rising at least 5 percent a year to 75 percent (Art. 18); written policies across governance, credit, risk, AML, outsourcing; 10-year document retention (Art. 13); a SAMA-non-objected external auditor (Art. 16); a complaints function (Art. 17).

On delay penalties, this document makes the call rather than leaving it open: سجّل charges none. The Rules permit them only per the Debt Collection Regulations and Procedures for Individual Customers; those regulations were replaced in March 2025 and their current permitted amounts could not be verified from here. More to the point, Tabby and Tamara have both publicly dropped late fees in KSA, framing the change around Shariah compliance; Tamara's own pages state the consequence of paying late is damage to the customer's SIMAH file and restricted access to the service, not a fee. A late fee would also break the debtor-pays-zero principle this product carries over. So: no late-fee revenue line, and the enforcement lever is credit reporting, which Art. 19 requires anyway.

## Route 2: a consumer microfinance license

The second requested rulebook page covers the Rules Regulating Consumer Microfinance Companies. Everything known about them here comes from search-result text: issued December 2019; minimum capital SAR 20,000,000 (SAMA has licensed below it, Sulfah at SAR 10M); a per-beneficiary cap of SAR 50,000; term cost to the consumer allowed, expressed as a fixed annual percentage on a declining balance; fees to the borrower capped at 1 percent of the finance amount. One more thing the search text says, and it matters: the 2019 rules were superseded effective 11 January 2026 by the amended Implementing Regulation of the Finance Companies Control Law. So the requested page is a repealed instrument, and counsel must work from the consolidated regime. One outlet's coverage says the consolidation kept the SAR 20M floor and the SAR 50,000 cap; that retention could not be corroborated independently, so treat both numbers as unconfirmed under the current regime.

The commercial difference is the right to charge the customer. That is also why the route fails this product twice over. First, it abandons the debtor-pays-zero principle that [business_model.md](business_model.md) calls non-negotiable; there is no version of this route where the عميل pays nothing, because the customer's term cost is the route's entire point. Second, it earns almost nothing on this asset anyway: a grocery tab of tens to hundreds of riyals, outstanding at most a month until the 27th, produces trivial term cost at any defensible rate, and the 1 percent fee cap on a SAR 300 tab is SAR 3. The route makes sense for a company selling cash loans to consumers. That is a different product and, effectively, a different company.

## Which route

The BNPL route, if any. The product is purchase-attached financing with no consumer cost, which is the BNPL definition; the single payment on the 27th sits inside the 12-installment cap; the per-consumer cap covers grocery tabs; the electronic-collection mandate matches the app's existing settlement design; capital entry is SAR 5M against a reported (unconfirmed post-consolidation) SAR 20M; and the customer keeps paying zero. The nearest live analogue is Tabby's Pay Next Month: shop all month at select stores, one consolidated bill issued on the 1st, due on the 3rd, no fees, no interest, per Tabby's own pages via search text. That is سجّل's unified pay-day in someone else's product, which cuts both ways: the shape is proven licensable, and a well-funded incumbent already runs it, though nothing found suggests it reaches neighborhood بقالة tabs.

This mapping is an analysis, not a determination; which regime applies is settled through SAMA's licensing process, and the choice of route, plus whether the December 2025 consolidation touched the BNPL rules, is a question for counsel before anything else in this document moves.

## What actually changes at the counter

The flip is not free at the counter, and the prototype's flow ([PROTOTYPE.md](PROTOTYPE.md)) does not survive it unchanged:

- A finance contract with the customer before any dealings. Art. 26 mandates a consumer contract with a dozen required contents: the amount, number, term and due dates of installments; consequences of delay; cancellation and refund procedures; early-payment procedures and compensation. The QR approval (UC-07) stops being a handshake between neighbours and becomes the acceptance of a regulated credit agreement, with approvals and acknowledgments shown as a pop-up before dealing (Art. 19.4).
- A consented credit check and SIMAH registration before the first financing (Art. 19). The merchant's chip-tap "connect a customer" (UC-08) gains a real underwriting step in the middle.
- Eligibility screens the بقالة clientele will actually hit: no consumers under 18 Hijri years (Art. 20.3), and no non-resident foreign consumers without a SAMA non-objection (Art. 20.4). Expatriate workers are everyday بقالة customers; this constraint alone could carve out much of a shop's tab book.
- The credit decision moves. In the repo the merchant sets the limits and overrides them per customer (UC-13), and may override the overdue warning and sell anyway (UC-06). When the money is سجّل's, neither survives: the exposure is سجّل's, set by its own documented creditworthiness method (Art. 19.5). A merchant could still cap their own shop below سجّل's limit, but could no longer raise a limit or override a block, because it is no longer their risk.
- Refunds come inside. [MVP.md](MVP.md) rules that refunds happen outside the app; Art. 26 makes cancellation and refund procedures a mandatory contract term, so this model has to design them.
- New products need SAMA's prior written non-objection (Art. 20.2), which slows the ship-and-iterate rhythm the prototype was built in.
- Coexistence is a real design question this document flags and does not settle: whether merchant-owned tabs (the ledger model) and سجّل-financed purchases can run side by side, per merchant or per purchase, and what happens to existing merchant-owned balances on the day lending switches on. Existing balances are the merchant's asset and stay so; nothing here converts them.

## Revenue under each route

Under BNPL: the merchant discount, and that is the financing revenue in full, since consumer fees are prohibited and this document has already forgone delay penalties. The existing merchant-side lines from [business_model.md](business_model.md) do not go away: the settlement-fee logic of line 1 folds into the discount, and the paid tier remains its own line. The model must clear on the merchant discount alone, against funding cost and credit losses.

Under microfinance: term cost and a capped fee, both paid by the customer. Stated plainly: this route's revenue exists only because the customer pays, and it is small on this asset. It is listed for completeness only.

## Seed-stage parameters

The owners have fixed the pilot's commercial parameters through the seed stage. They are recorded here as decisions the rest of this document is held against, not as analysis, and none of them overrides the license-first rule in Sequencing:

- Working capital: SAR 100,000 of own money, until a seed round.
- Per-customer cap: SAR 1,000 total outstanding, across all merchants and all transactions.
- Credit cutoff: financing stops 30 days after the customer's last payment, even if the cap has not been reached.
- Merchant discount fee: 6 percent.
- Merchant settlement: the merchant is paid on the 27th of the month, whether or not the customer has paid.

What those figures do to the model, arithmetic only:

- Paying merchants 94 halalas per riyal of financed tab, SAR 100,000 funds about 106 customers drawn to the full cap; more in practice, since real tabs run below it.
- If the whole capital turns over once a month, gross revenue tops out near SAR 6,000 a month, before credit losses and before any operating cost.
- A customer who defaults at the cap costs SAR 940 net, the fees of about 16 fully drawn customers who pay. Break-even before costs sits near a 6.4 percent default rate on financed volume; the 30-day cutoff is the control that keeps a silent customer from riding exposure to the cap.
- Six percent sits at the top of the analyst-estimated Tabby range (3 to 7 percent), in the one segment, grocery, those same estimates say negotiates the bottom of it. Gate 3 exists to test this number against real merchants.
- Settling merchants on the 27th regardless of customer payment moves the 27th from the customer's due date to the merchant's payout date and leaves the funding cycle open at the far end: capital is committed from payout until the customer actually settles, so effective capacity sits below the 106 figure.
- SAR 100,000 is 2 percent of the SAR 5M licensing minimum (BNPL Rules, Art. 5). Until that gap closes, these parameters can operate only through the licensed-partner shape in Sequencing, or stay on paper; there is no licensable own-book configuration at this capital level.

## What this model adds that the ledger model does not have

Every item here is absent from [business_model.md](business_model.md) because that model never touches the money:

- Regulatory capital: SAR 5M minimum for BNPL (BNPL Rules, Art. 5), in a joint stock company, with a full-capital bank guarantee during establishment.
- Funding for the receivables. The book has to be financed every month between paying merchants and collecting on the 27th. At scale the licensed players fund it with warehouse debt secured on receivables: Tabby with up to $700M from J.P. Morgan, Tamara with a Goldman Sachs facility reported upsized to $400M (search text). Equity is the binding constraint because of the 20x cap. A pilot-scale book needs a much smaller but still real funding line, and Art. 22.5 restricts borrowing from unlicensed financiers.
- Credit losses. No public KSA BNPL default rate exists; AGBI reports that directly, with Tabby declining to comment. Nearest proxies from the same piece: about 1.4 percent of Saudi banks' card lending non-performing at end-2021, against a 4.65 percent US card charge-off rate in Q3 2024. That losses bite is confirmed qualitatively: a single secondary snippet has Tamara's Q2 2026 Saudi net profit down a third from Q1 on funding costs and expected credit losses. سجّل's customers are the informal end of the market, where no proxy applies.
- A collections operation. In the ledger model the Debt Collection Regulations set norms; here they bind directly, and cash collection is prohibited (BNPL Rules, Art. 22.3).
- SIMAH membership, consent flows, and continuous credit reporting (BNPL Rules, Art. 19).
- Shariah structuring. Under the Finance Companies Control Law framework, licensed companies must conduct finance activity consistently with Shariah principles as determined by their Shariah committees (Lexology's KSA lending overview, search text), and the licensed BNPL players market compliance. How a zero-consumer-cost, merchant-fee product is papered is for a Shariah committee, not this document.
- A compliance organization: Saudization from 50 rising to 75 percent, AML/CDD program, phone and national-address verification, 10-year retention, external auditor, complaints function, SAMA reporting (BNPL Rules, Arts. 13 to 21, 28 to 29).

## Sequencing

The ledger comes first, for a reason beyond cost. Every month of the ledger model produces the one dataset this model needs and nobody else has: repayment behavior of informal grocery customers against a single monthly due date. Who pays on the 27th, who pays late, who never pays. That is the underwriting asset. Morocco's Chari ran a version of this arc: it bought Karny, a khata-style ledger app, to learn how tab credit gets repaid, piloted BNPL with grocery stores, and bought a licensed credit business to lend, though Chari lends to the shop, not the shopper (TechCabal, Zawya; search text). In KSA, DaftarPay, licensed by SAMA for BNPL in July 2026 as the Kingdom's 76th licensed finance company (Arab News), is literally named after the دفتر; whether it touches the consumer side of a store tab was not established from here. Nothing found anywhere finances the shopper's بقالة tab, which makes سجّل's segment either an open field or a graveyard, and the ledger data is how to learn which.

Switching lending on is a license-first decision. There is no unlicensed pilot of any size: Art. 3 prohibits the activity without a license, and Art. 30 makes violations of the Rules violations of the Finance Companies Control Law. The day the first riyal moves from سجّل to a merchant against a customer's tab, the license must already exist.

The lower-risk sibling for this product is not the referral line in [business_model.md](business_model.md), which finances the merchant (working capital from Lendo, Forus and the like); a consumer-financing sibling would be a partnership with an already-licensed BNPL company: they hold the license, the capital and the book, سجّل is the merchant network, the counter flow and the repayment data, and earns a commission. Whether any licensed player wants بقالة tabs is unknown. Pricing that partnership against own-book lending is one of the gates below.

## Risks specific to this model

- Credit losses on informal customers. The customers are picked by merchants, not underwritten; some have no credit file. Watch: the on-time rate against the 27th in the ledger phase, per customer cohort, because that number is the loss estimate this model will be built on.
- Funding cost against the merchant fee. The whole margin is discount minus funding minus losses, and Tamara's reported Q2 2026 squeeze shows both negative terms moving at once. Watch: what warehouse-style funding actually costs at pilot scale, before committing to any discount rate.
- Shariah structure. If the committee's structure adds friction at the counter or cost per transaction, the flip breaks. Watch: how the licensed players paper single-cycle products, and an early scholar consultation.
- License timeline and capital. SAR 5M plus a guarantee plus a joint stock company plus a SAMA process measured in months is the entry ticket before revenue. Watch: SAMA's actual processing times for recent licensees, and whether the December 2025 consolidation changed BNPL entry terms.
- سجّل becomes the collector. The ledger model's trust dynamic is the merchant and customer settling their own relationship, with the app as witness. Here سجّل dunns the customer directly, and a customer who resents the collector stops scanning the QR. Watch: settlement-link payment rates in the ledger phase when reminders come from the app rather than the merchant, the closest available proxy.
- The rules move. Art. 22 was amended within two years of issuance, the Debt Collection Regulations were replaced in 2025, and the microfinance rulebooks were repealed outright in the December 2025 consolidation. Watch: SAMA circulars, quarterly, by counsel.

## Gates before any license application

In order, each gating the next:

1. The ledger model is live and generating real repayment data on the 27th cycle across multiple months, per [MVP.md](MVP.md) and [business_model.md](business_model.md). How many months is the owners' call; zero is not an option.
2. KSA counsel has read the current BNPL Rules on the rulebook, including the 2025 amendments and the current Debt Collection Regulations, and confirmed the route, the caps, and the permitted consumer-side charges.
3. Pilot merchants have said, to a number, what discount they would accept for cash-now and zero default risk, and that number exceeds the measured non-payment rate from gate 1 plus an honest funding cost.
4. A partnership with an already-licensed BNPL company has been explored and priced against own-book, and own-book won on evidence.
5. A funding source for the receivables and the SAR 5M capital are committed, and a Shariah opinion on the product structure exists.

If any gate fails, the answer is the ledger model, which is the business سجّل is already building.

## Sources

Consulted August 2026. The only document actually fetched and read was the BNPL Rules PDF from Argaam's file store; every other entry is search-result text tied to the listed URL, and every figure needs confirming on the live page.

Primary sources this document must be verified against, both unreachable from the research environment:

- SAMA rulebook, BNPL rules: https://rulebook.sama.gov.sa/en/buy-now-pay-later-bnpl
- SAMA rulebook, consumer microfinance rules (since superseded): https://rulebook.sama.gov.sa/en/rules-regulating-consumer-microfinance-companies-0

Read in full:

- Rules Regulating Buy-Now-Pay-Later Companies, official English PDF, Nov 2023, via Argaam's mirror: https://argaamplus.s3.amazonaws.com/bef57897-a46c-41c2-be8d-b8d2d0449291.pdf

Search-result text only:

- SAMA rulebook circular issuing the BNPL Rules, Dec 2023: https://rulebook.sama.gov.sa/en/circular-re-rules-regulating-buy-now-pay-later-bnpl-companies
- SAMA rulebook, Article 22 as amended (SAR 10,000 cap, Dec 2025): https://rulebook.sama.gov.sa/en/article-22-credit-limits
- SAMA rulebook circular on the updated Debt Collection Regulations, Mar 2025: https://rulebook.sama.gov.sa/en/circular-re-update-debt-collection-regulations-and-procedures-individual-customers
- SAMA rulebook circular on the amended Implementing Regulation and the supersession of the microfinance rules, Dec 2025: https://rulebook.sama.gov.sa/en/circular-re-amendment-implementing-regulation-finance-companies-control-law-and-supersession-rules
- SPA on early BNPL permits: https://www.spa.gov.sa/w1911098
- Arab News on Tabby's SAMA permit, Jul 2023: https://www.arabnews.com/node/2344021/business-economy
- SPA on Tamara Finance's consumer finance and BNPL license, Mar 2025: https://www.spa.gov.sa/en/N2274386
- Arab News on DaftarPay's BNPL license, Jul 2026: https://www.arabnews.com/node/2649862/business-economy
- 1Arabia on the Madark license and unlicensed-operator exposure, May 2026: https://www.1arabia.com/2026/05/madark-licence-deepens-saudi-bnpl.html
- GCC Business News on the Dec 2025 finance-company regulation update (capital floors; its microfinance-retention claim is uncorroborated): https://www.gccbusinessnews.com/sama-updates-finance-firms-regulations/
- MCO on the updated Implementing Regulation: https://mco.sa/2336/
- SAMA news release on Sulfah's consumer microfinance license: https://sama.gov.sa/en-us/news/pages/news-754.aspx
- Zain KSA on Tamam's consumer microfinance license, Jan 2021: https://sa.zain.com/en/all-news/news-02-01-21
- Lexology overview of KSA lending regulation (Shariah committees): https://www.lexology.com/library/detail.aspx?g=b6d61d1d-3803-4e40-ae4a-615f67f4670a
- TechCrunch on Tabby's Series E and scale, Feb 2025: https://techcrunch.com/2025/02/11/tabby-lands-160m-at-a-3-3b-valuation-as-it-expands-beyond-bnpl/
- TechCrunch on Tamara's Series C, Dec 2023: https://techcrunch.com/2023/12/18/saudi-shopping-and-bnpl-platform-tamara-tops-1b-valuation-in-340m-series-c-funding
- Third-party analyses of Tabby's merchant discount rates and revenue lines (analyst estimates; the pages could not be fetched from here): https://valueforstartups.in/tabby and https://medium.com/@khusnudshahidi_388/how-tabby-built-the-middle-easts-largest-bnpl-system-fbfbdf122d2c
- Tabby on Pay Next Month mechanics: https://tabby.sa/en-SA/pay-later and https://support.tabby.ai/l/en/pay-next-month/how-does-pay-next-month-work
- Tabby and Tamara on dropping late fees, and Tamara's stated late-payment consequences: https://tabby.ai/en-AE/newsroom/no-late-fees and https://tamara.co/en-sa/blog-post/no-late-fee and https://tamara.co/en-sa/terms-and-conditions
- Wamda on Tabby's $700M J.P. Morgan facility: https://www.wamda.com/2023/12/tabby-announces-pre-ipo-700-million-debt-facility-jpmorgan
- FinTech Futures and Latham & Watkins on Tamara's Goldman Sachs warehouse: https://www.fintechfutures.com/bnpl-payments/saudi-bnpl-firm-tamara-lands-150m-debt-facility-from-goldman-sachs and https://www.lw.com/en/news/latham-advises-tamara-on-its-upsized-growth-debt-financing
- AGBI on the absence of public GCC BNPL default data and the credit-quality proxies: https://www.agbi.com/analysis/finance/2024/12/cultural-factors-reduce-risk-for-gulf-bnpl-providers/
- Entarabi on Tamara's Q2 2026 Saudi results (single snippet, disclosure venue unidentified): https://entarabi.com/en/2026/08/tamaras-saudi-revenue-surges-to-sar-707-million-in-q2-as-islamic-financing-nears-bnpl/
- TechCabal on Chari buying Axa's Morocco credit arm, and Zawya on Chari's grocery-store BNPL pilots (the Karny acquisition is reported in the same coverage arc): https://techcabal.com/2022/03/03/chari-to-acquire-the-credit-arm-of-france-based-axa-assurance-in-morocco-for-22m/ and https://www.zawya.com/en/press-release/chari-closes-a-bridge-round-to-pilot-bnpl-services-with-grocery-stores-in-francophone-africa-ownlr3ti
