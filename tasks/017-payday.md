# 017: Unified pay-day

Use case: UC-19. Status: done in prototype.

Everything owed falls due on the 27th, pay-day. The point is that the customer stops thinking in per-purchase terms and starts thinking about one date a month.

## Display

A gold strip states it in full — "تاريخ الاستحقاق الموحد: 27 من كل شهر · يوم الرواتب" — at the top of both dashboards, at the top of both account heroes above the balance, on the purchase confirmation, and on the web checkout page.

## Computation

`PAYDAY` is 27. `dueFromDays()` still adds the account's term to the purchase date, then rolls forward to the first 27th on or after it. A 30-day term on a purchase made on 18 August lands on 27 September.

Seed dues moved onto the day: أحمد 27 أغسطس, سالم 27 يوليو (22 days late), مخبز الضحى 27 يوليو. The overdue demo tool in merchant settings does the same.

## Acceptance

- Every due date the prototype produces or seeds falls on the 27th.
- The strip is visible without scrolling on both dashboards.

## Open for MVP

Whether the day is set per merchant or per customer, what a purchase made on the 26th does, and the reminders that lead up to the date.
