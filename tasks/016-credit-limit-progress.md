# 016: Credit limit progress bar

Use case: UC-18. Status: done in prototype.

A bar shows how much of the credit limit is used, in two places:

- The merchant's account view, inside the hero. The limit and available figures are already in the grid above it, so the bar carries only the fill and a note.
- The customer's account view, in a credit card block under the hero, with limit and available on the row above the bar.

## Colour

Driven by consumption, so it darkens as the customer approaches the limit:

| Used | Class | Fill |
|---|---|---|
| under 60% | `lb-ok` | green |
| 60–84% | `lb-warm` | tan |
| 85–99% | `lb-hot` | tan into amber |
| 100% | `lb-full` | amber into red |

The note under the bar changes with it, from a plain percentage to "اقتربت من استهلاك الحد" and then "بلغت الحد الائتماني بالكامل".

## Seed data

سالم العتيبي sits at 83% of his custom 1,500 limit. On the customer side, مخبز الضحى is at 70% of 600 and سوق النور at 0% of 500; بقالة الريان mirrors أحمد's account, so it moves with every purchase and payment.

## Acceptance

- The fill matches balance ÷ limit, capped at 100%.
- The colour changes as a purchase pushes a customer over each threshold.

## Open for MVP

Whether a merchant may set a limit below the current balance, and how the bar reads when they do.
