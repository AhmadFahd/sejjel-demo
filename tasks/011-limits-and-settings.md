# 011: Limits and settings

Use case: UC-13. Status: done in prototype.

## Merchant defaults

Credit limit and payment term in days. Seed values are 1,000 ر.س and 30 days.

## Per-customer override

- Each field is gated by a checkbox. Unchecked shows موروث من الافتراضي with the default in brackets; checked turns it into an editable قيمة مخصصة.
- Save and reset. Reset returns the customer to inherited values.
- Customers with an override are marked ✦ in lists.

## Also on the settings screen

- إعادة التعيين reloads the page, which resets all demo state.
- A demo tool flips أحمد محمد to overdue so the warning path in task 004 can be shown.

## Acceptance

- Changing the default moves every inheriting customer and leaves overridden ones alone.
- The due date on the next purchase follows the term in force for that customer.

## Open for MVP

Whether changing a limit should affect existing balances, an audit trail of limit changes, and per-customer terms in weeks or on a fixed day of the month.
