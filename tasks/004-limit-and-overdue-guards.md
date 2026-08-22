# 004: Credit limit and overdue guards

Use cases: UC-05, UC-06. Status: done in prototype.

## Limit breach

- Purchase that would push the balance past the customer's limit is blocked on its own screen.
- The block screen links straight to that customer's limit settings, so the merchant can raise it and come back.
- The limit is either inherited from the merchant default or a per-customer override.

## Overdue

- An overdue customer carries a red dot on their chip, before the merchant even selects them.
- Selecting one disables the submit button and shows the balance, the days past due and the due date in red.
- The button unlocks only when the merchant ticks the explicit manual override, so nobody sells on credit to an overdue account by reflex.

## Acceptance

- سالم العتيبي (1,250 balance, 1,500 custom limit) blocks at a purchase above 250.
- The demo tool in settings flips أحمد محمد to overdue so the locked path can be shown.

## Open for MVP

Should the override be logged against the merchant, or need a second approver? Should a merchant be able to raise a limit mid-purchase, or should that need a second confirmation? Both are open questions for the business.
