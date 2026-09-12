# What a Saudi shop can be asked to prove at onboarding

Research for [issue #95](https://github.com/AhmadFahd/sejjel-demo/issues/95), a child of the
operator console map [#91](https://github.com/AhmadFahd/sejjel-demo/issues/91).

This is fact-finding. It does not say what سجّل should collect, and it is not legal advice.
Which of these a merchant is actually asked for is a separate decision.

## How this was sourced, and the limits of it

Every URL below is a primary source: a Saudi government portal, the SAMA rulebook, or the
published documentation of a payment gateway. The sandbox this was written in blocks direct
page fetches to those domains, so the pages were reached through search over them rather
than read end to end. The URLs are authoritative; the wording of individual claims is at one
remove from the page. Anything I could not source is listed as such rather than filled in.

## The short version

| Thing | Issued by | Verifiable against a source? | Lead time or dependency |
| --- | --- | --- | --- |
| Commercial registration (CR) | Ministry of Commerce | Yes. Public lookup by CR number or trade name, plus a Wathq API that returns status, owners and managers | Wathq needs a subscription and credentials. The public lookup needs nothing |
| VAT registration | ZATCA | Yes. ZATCA taxpayer lookup by VAT number, certificate number or CR number, with usage restrictions attached | None for the lookup. Many small shops are legitimately not registered at all |
| National address | Saudi Post / SPL | Yes. A proof-verification service for the document and an address API for the data | API access needs a subscription |
| IBAN for payouts | The shop's bank | Only partly. SAMA's checker validates the structure, not the owner. Ownership is proven by a bank-issued IBAN certificate that a person reads | The certificate comes from the bank and the process varies by bank |
| Owner national ID or Iqama | Ministry of Interior | Yes, through Yakeen or Nafath, both of which are contracted integrations. Otherwise it is a photograph | Contract and integration before either works |

The pattern worth noticing: the CR is the strong anchor. It is verifiable for free, it carries
the owners, and under the new register it carries the approved business address too. Most of
the other documents either hang off it or repeat it.

## 1. Commercial registration (السجل التجاري)

The Law of Commercial Register and the Law of Trade Names, with their implementing
regulations, took effect on 3 April 2025
([SPA](https://www.spa.gov.sa/en/N2292296),
[SPA](https://spa.gov.sa/en/N2291554)).
What changed matters for anyone judging a CR today:

- One unified register covers all of an establishment's activities across the kingdom.
  Sub-registers are abolished and the register no longer names a city
  ([Ministry of Commerce](https://mc.gov.sa/en/mediacenter/News/Pages/17-09-24-02.aspx),
  [SPA](https://spa.gov.sa/en/N2173125)).
- The register has no expiry date. It is kept alive by an annual electronic confirmation of
  its data instead of a renewal. Failing to confirm leads to suspension and eventually
  deletion ([SPA](https://www.spa.gov.sa/en/N2292296),
  [Ministry of Commerce](https://mc.gov.sa/en/mediacenter/News/Pages/06-07-25-03.aspx)).
  So "is this CR still valid" is now a question about a confirmation date, not an expiry date.
- The CR number is the establishment's unified number and begins with 7
  ([SPA](https://www.spa.gov.sa/en/N2292296)).
- Businesses are required to link bank accounts to their commercial registration, and to
  obtain an activity licence within 90 days of registration
  ([SPA](https://www.spa.gov.sa/en/N2292296)).

The register document itself was redesigned to a single page whose QR code gives access to
the registered activities, the registration date, the annual confirmation date, the approved
business address, the list of directors and the capital
([SPA](https://www.spa.gov.sa/en/N2325324)). The Ministry also runs a QR service for traders
([Ministry of Commerce](https://mc.gov.sa/ar/About/QR/Pages/default.aspx)). This is the one
case where a photograph is not just a photograph: a picture of a current CR carries a pointer
back to the authoritative record.

**Verification.** Three routes, in ascending order of effort:

- The Ministry's electronic commercial registration inquiry, by trade name or CR number
  ([ecr.mc.gov.sa](https://ecr.mc.gov.sa/en/Land?returnUrl=/en)), also listed on the national
  portal ([GOV.SA service 18443](https://my.gov.sa/en/services/18443)).
- Wathq, the Ministry's data platform. Its commercial registration APIs return trade name,
  register status, capital, owners and managers
  ([Commercial Registration, new legislation](https://developer.wathq.sa/en/api/32),
  [Commercial Registration Search](https://developer.wathq.sa/en/api/20),
  [Commercial Registration using Unified SSO](https://developer.wathq.sa/en/api/19),
  [all services](https://developer.wathq.sa/en/apis)). The Ministry announced CR data online
  and free of charge with a free basic package and APIs
  ([Ministry of Commerce](https://mc.gov.sa/en/mediacenter/News/Pages/02-11-19-01.aspx));
  current tiers are on [Wathq pricing](https://developer.wathq.sa/en/Pricing).
- The QR on the register document itself.

Two things this buys an operator that a photograph does not: a status field, so an active
register is distinguishable from a suspended one, and the list of owners, so the person
claiming to own the shop can be checked against the register without ever looking at an ID
card.

**The adjacent document.** A grocery, laundry or cafeteria also needs a municipal commercial
licence from Balady, whose requirements vary by activity
([Balady, issuing a commercial licence](https://balady.gov.sa/en/services/issuing-commercial-license),
[Balady, requirements](https://balady.gov.sa/en/node/10856),
[Balady, activity requirements inquiry](https://balady.gov.sa/en/services/commercial-activities-and-municipal-requirements)).
That licence is also verifiable: the Ministry of Municipalities and Housing runs an inquiry
service for a business licence
([momah.gov.sa](https://momah.gov.sa/en/e-services/inquiring-about-business-license)).
It is the document that says a shop is allowed to trade from a particular premises, which the
CR alone does not.

**Could not source.** The digit length of a CR number from a government page. Secondary write-ups
consistently say ten digits, and consistently describe legacy city prefixes such as 1010 for
Riyadh, but I found no Ministry page stating either. The primary sources support "begins with 7"
for the unified number and nothing more about the format.

## 2. VAT registration (ZATCA)

The mandatory threshold is SAR 375,000 of taxable supplies over any twelve months. A person
whose supplies exceed it must register
([ZATCA, About VAT](https://zatca.gov.sa/en/RulesRegulations/VAT/Pages/About_Vat.aspx),
[ZATCA FAQ](https://zatca.gov.sa/en/HelpCenter/FAQs/Pages/FAQ_026.aspx)).
Businesses with annual revenue between SAR 187,500 and SAR 375,000 may register voluntarily,
which lets them reclaim input tax
([ZATCA news](https://zatca.gov.sa/en/MediaCenter/News/Pages/News_068.aspx)).

The consequence for سجّل is the useful part. A small grocery, laundry or cafeteria may sit
below SAR 375,000 and be entirely compliant with no VAT number at all. Treating a VAT
certificate as a required document would exclude legitimate shops, and would exclude exactly
the smallest ones.

**Verification.** ZATCA publishes a lookup that verifies the current VAT registration status
of any business, searchable by VAT account number, VAT certificate number or CR national
number ([ZATCA taxpayer lookup](https://zatca.gov.sa/en/eServices/Pages/TaxpayerLookup.aspx),
[user manual](https://zatca.gov.sa/en/eServices/UserManual/Pages/UserManual-007.aspx?service=eServices_007)).
Read the disclaimer before building on it: ZATCA states it is not responsible for the
correctness of data obtained through the service, places verification on the user, and says
the data must not be used for marketing, promotion, data analysis or selling.

Being able to search by CR number is worth noting on its own. It means VAT status can be
derived from the CR rather than collected as a separate document.

**Adjacent.** Phase one of e-invoicing (Fatoora) has been mandatory since 4 December 2021 for
all resident taxpayers subject to VAT, and for parties issuing tax invoices on their behalf
([ZATCA roll-out phases](https://zatca.gov.sa/en/E-Invoicing/Introduction/Pages/Roll-out-phases.aspx),
[simplified guide](https://zatca.gov.sa/en/E-Invoicing/Introduction/Guidelines/Documents/E-invoicing_Simplified%20GL.pdf)).
A VAT-registered shop therefore already produces structured electronic invoices. That is
out of scope here but touches the invoice attachment feature.

**Could not source.** The deadline for applying to register after crossing the threshold. The
place to look is the
[VAT Implementing Regulations](https://zatca.gov.sa/en/RulesRegulations/Taxes/Documents/Implmenting%20Regulations%20of%20the%20VAT%20Law_EN.pdf),
which I could not read in full here. Also the VAT number format. Secondary sources agree it
is fifteen digits starting with 3, but I found no ZATCA page stating the structure.

## 3. The national address (العنوان الوطني)

The unified national addressing system was approved by Council of Ministers resolution 252
of 3 June 2013 and covers the whole kingdom
([SPL](https://splonline.com.sa/en/national-address-1/)).

An address is made of a building number of four digits, the street, a secondary or additional
number of four digits, the district, a five-digit postal code and the city
([National Address, address format](https://address.gov.sa/en/address-format/),
[building numbers](https://address.gov.sa/en/address-format/building-number)).
The short address is a compact form of the same thing: four letters derived from the postal
code plus four digits, the building number
([National Address](https://address.gov.sa/en/address-format/)).
Eight characters is short enough to be a field a merchant types rather than a document they
photograph.

**Verification.** Both the document and the data are checkable:

- The National Address Verification Service confirms the validity of an electronic national
  address proof ([proof.address.gov.sa](https://proof.address.gov.sa/),
  [GOV.SA service 182787](https://my.gov.sa/en/services/182787)).
- The National Address API resolves and verifies addresses by short address, phone number,
  geocode or free text
  ([verify an address](https://api.address.gov.sa/verifyanaddress),
  [SPL National Address API](https://splonline.com.sa/en/national-address-api/)).
- Wathq exposes a National Address API too
  ([Wathq](https://developer.wathq.sa/en/api/17)), which matters if the CR integration is
  being built anyway.
- A registrant can manage and print their own address document
  ([GOV.SA](https://my.gov.sa/en/services/119858),
  [register.address.gov.sa](https://register.address.gov.sa/en/)).

**Could not source.** That registering a national address is legally mandatory for every
business. Every source asserting it is a consultancy blog, not a government page. The
better-sourced and probably more useful fact is that the redesigned commercial register
already carries the approved business address
([SPA](https://www.spa.gov.sa/en/N2325324)), so for a shop with a current CR the address may
be retrievable rather than collectable.

## 4. An IBAN for payouts

A Saudi IBAN begins with SA and is exactly 24 characters
([SAMA rulebook, printed IBAN account formats](https://rulebook.sama.gov.sa/en/printed-iban-account-formats),
[SAMA rulebook 7.12 IBAN](https://rulebook.sama.gov.sa/en/712-iban)).
SAMA publishes an IBAN checker
([sama.gov.sa](https://sama.gov.sa/en-US/Services/pages/ibanchecker.aspx)).

Be precise about what that checker does. It validates that a string is a well-formed Saudi
IBAN and identifies the bank. It does not answer the question an operator actually has, which
is whether this account belongs to this shop. I found no public government service that
answers that.

**How the industry answers it instead.** Two mechanisms, both of which end with a person
reading a document:

- A bank-issued IBAN certificate. Tap tells merchants to obtain it from their bank's support
  team and notes the process varies by bank
  ([Tap support](https://support.tap.company/en/support/solutions/articles/153000242639-what-are-the-documents-needed-to-get-started-with-tap-payments-)).
  That is the lead time on this item, and it sits outside سجّل entirely.
- A name match. Tap requires the account name in banking records to be in English and to match
  the legal name on the commercial licence or registration document
  ([Tap support](https://support.tap.company/en/support/solutions/articles/153000242639-what-are-the-documents-needed-to-get-started-with-tap-payments-)).
  Moyasar requires a valid Saudi commercial registration or freelance licence and a Saudi
  commercial bank account linked to it
  ([Moyasar FAQs](https://moyasar.com/en/resources/faqs/)).

There is also a government-side link now. Under the new Commercial Register law, businesses
are required to link bank accounts to their commercial registration
([SPA](https://www.spa.gov.sa/en/N2292296)). That link lives between the bank and the
Ministry. I did not find a public service that exposes it, so it does not help an operator
directly, but it means the relationship exists on record somewhere.

**What the gateway itself takes.** Moyasar's payout account API is narrow: an account type,
an IBAN, and credentials the bank issues after enabling a B2B service on the account
([Moyasar, create payout account](https://docs.moyasar.com/api/payouts/01-create-payout-account/),
[payout account details](https://docs.moyasar.com/guides/payouts/payout-account-details)).
The document checking happens in Moyasar's own KYC before that, not in the API
([Moyasar FAQs](https://moyasar.com/en/resources/faqs/)).

**Worth seeing.** Because سجّل passes settlement through a gateway to the merchant, the
gateway performs this merchant KYC regardless. Whatever سجّل collects about bank accounts is
a second copy of a check somebody else is contractually obliged to run. Whether that
duplication is worth it is a product decision, not this ticket.

Tap also flags that extra documents are required depending on ownership type and activity:
ownership chains where a company holds 20 to 25 percent or more, enhanced due diligence for
marketplaces, and a copy of any sector regulator's licence for regulated activities
([Tap support](https://support.tap.company/en/support/solutions/articles/153000242653-extra-documents-may-be-needed-to-get-started-with-tap-payments)).
A single-owner grocery avoids all three, which is part of why small retail onboarding is
lighter than it looks.

## 5. The owner's national ID or Iqama

**Verification.** Two national services exist, and both are relationships rather than open
endpoints:

- Yakeen, operated by Elm, verifies the personal data of citizens, residents and visitors
  against National Information Center records
  ([Elm, Yakeen](https://elm.sa/ar/our-business/digital-products/Documents/En/Yakeen%20EN.pdf),
  [UAPI service provider listing](https://uapi.sa/UapiServiceProviders/SP014)).
  SAMA's rulebook recognises it: banks may use Yaqeen as an additional option for
  electronically verifying customer identities
  ([SAMA rulebook, Yaqeen for ID verification](https://rulebook.sama.gov.sa/en/yaqeen-id-verification)).
  That is a useful precedent. A regulator has already blessed the mechanism for exactly this
  purpose.
- Nafath and the National Single Sign-On authenticate a person through their government
  digital identity across government and private services such as banking and telecoms
  ([GOV.SA, National Single Sign-On](https://my.gov.sa/en/services/119727),
  [iam.gov.sa](https://www.iam.gov.sa/authservice/userauthservice?lang=en),
  [DGA Nafath integration component](https://oss.dga.gov.sa/en/products/dga-ac442-keycloak-nafath-app)).
  Note the difference from Yakeen: Nafath proves a live person is who they say they are, by
  pushing a challenge to their phone. It does not tell you whether a photographed card is real.

Without one of those, an ID or Iqama is a photograph a person looks at, and a person looking
at a photograph cannot tell a real card from a good edit.

**The cheaper route.** The CR names its owners, and Wathq returns them
([Wathq commercial registration APIs](https://developer.wathq.sa/en/apis)). For a sole proprietorship, which is what a
small grocery or laundry usually is, comparing the claimed owner against the register answers
most of the question without an ID document at all.

**Could not source.** The digit format. Secondary sources agree that both are ten digits, that
a citizen national ID begins with 1 and an Iqama begins with 2, and that there is a check
digit, but I found no Ministry of Interior or National Information Center page stating it.

## 6. Does lending nothing and holding no money narrow what is required?

Handle this carefully. What follows is what the sources say, not a conclusion about سجّل's
obligations.

**What the rules say they apply to:**

- SAMA's Rules for Regulating Buy-Now-Pay-Later Companies apply to companies licensed by SAMA
  to engage in BNPL activity, and define BNPL activity as a type of financing that lets a
  consumer buy goods or services without a term cost
  ([SAMA rulebook](https://rulebook.sama.gov.sa/en/rules-regulating-buy-now-pay-later-bnpl-companies-0),
  [rules PDF](https://sama.gov.sa/en-US/RulesInstructions/FinanceRules/BNPL_rules_en.pdf),
  [SAMA announcement](https://www.sama.gov.sa/en-US/News/Pages/news-1001.aspx)).
  Licensing to engage in deferred payment activity sits under the Finance Companies Control
  Law and those rules
  ([SAMA licensing guidelines](https://rulebook.sama.gov.sa/en/guidelines-applying-license-practice-bnpl-activity)).
  Those rules carry real weight: a licensed BNPL company must verify and document the
  consumer's credit record with their consent and register their credit information with a
  licensed credit bureau
  ([SAMA rulebook](https://rulebook.sama.gov.sa/en/rules-regulating-buy-now-pay-later-bnpl-companies-0)).
- Payment services, including payment aggregation, are defined in the Law of Payments and
  Payment Services and its implementing regulation, and a payment service provider must not
  act outside the scope of its licence
  ([SAMA rulebook, Law of Payments and Payment Services](https://rulebook.sama.gov.sa/en/law-payments-and-payment-services),
  [implementing regulations](https://rulebook.sama.gov.sa/en/implementing-regulations-payments-and-payment-services-law),
  [PDF](https://www.sama.gov.sa/en-US/LawsRegulations/DocLib/Implementing_Regulations_for_Law_of_Payments_and_Payment_Services-EN.pdf)).

**What that supports, and what it does not.** Both definitions are cast in terms of an entity
that finances a consumer, or that executes, transfers, processes or pools payment
transactions. A ledger that records credit the merchant itself extended, and that routes
settlement through a licensed gateway to the merchant's own account, does not obviously sit
inside either definition. That is a reading of scope wording, not a finding. I found no SAMA
statement addressing this arrangement, and I am not qualified to give the answer. Anything
load-bearing here needs a Saudi lawyer or a direct question to SAMA.

**What holds regardless.** The gateway سجّل settles through is itself licensed and will run
merchant KYC, demanding a CR, a bank account and identity documents whatever سجّل collects
([Moyasar FAQs](https://moyasar.com/en/resources/faqs/),
[Tap support](https://support.tap.company/en/support/solutions/articles/153000242639-what-are-the-documents-needed-to-get-started-with-tap-payments-),
[Tap regulatory licences](https://www.tap.company/en-sa/regulatory-licenses)).
So this data exists about every settled shop somewhere in the chain. The question for سجّل is
what its own operator needs in order to judge, not what the chain as a whole requires.

## Everything I could not source

Stated here so nobody mistakes a gap for a finding.

- The digit length and legacy city prefixes of a CR number, from a government page.
- The internal structure of a ZATCA VAT number, from a ZATCA page.
- The deadline for applying to register for VAT after crossing SAR 375,000.
- That a national address is legally mandatory for every business, from a government page.
- Any public service that answers "who owns this IBAN".
- The digit format of a national ID and an Iqama, from a government page.
- Whether سجّل's arrangement falls outside SAMA's financing and payment service definitions.
- Current Wathq, Yakeen and Nafath commercial terms and onboarding lead times. Each has a
  pricing or subscription page but I could not read them here.
