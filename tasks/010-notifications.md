# 010: Notifications

Use case: UC-12. Status: done in prototype, in-app only.

- Bell with an unread badge on the merchant side, a nav badge on the customer side.
- Actionable items open the screen they belong to: a purchase approval opens the approval screen.
- Items carry a state: unread, done, cancelled.
- Cancelling a pending purchase removes the stale actionable item so a customer cannot approve a request that no longer exists.
- Payments push a notification to the merchant right away.

## Acceptance

- Unread counts drop when the list is opened.
- No actionable item survives its underlying request.

## Open for MVP

Push notifications outside the app, SMS fallback for payment reminders, and a due-date reminder schedule.
