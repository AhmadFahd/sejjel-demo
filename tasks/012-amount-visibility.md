# 012: Hide and show amounts

Use case: UC-14. Status: done in prototype.

## Behaviour

An eye button sits next to the title on four screens: both dashboards and both account views. Tapping it replaces every money figure on screen with `•••• ر.س` and swaps the icon for a crossed-out eye. Tapping again brings the figures back. A toast confirms which way it went.

The switch is one flag for the whole prototype, `S.hideAmt`, so it holds when you move between screens and when you switch role. It is not persisted; a refresh clears it.

## What gets masked

Dashboard totals, customer and merchant card balances, the hero balance, credit limit and available, and transaction amounts (the sign goes with them, so a masked row reads `•••• ر.س` with no `+` or `−`).

Counts are not amounts and stay visible: number of customers, number of merchants, the transactions counter, and the percentage on the credit bar.

## Not masked

Screens where the user is acting on one specific figure: the purchase confirmation, the settlement screen, and the web checkout page. Hiding the number you are about to approve or pay would be worse, not safer.

## Acceptance

- Toggling on any of the four screens masks every other screen too.
- The eye icon reflects the current state on whichever screen you land on.

## Open for MVP

Remembering the choice between sessions, and masking by default when the app returns from the background.
