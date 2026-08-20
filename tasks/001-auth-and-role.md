# 001: Auth and role selection

Use case: UC-01. Status: done in prototype.

## Flow

1. Welcome screen shows the brand سجّل and two role buttons: تاجر, عميل.
2. Mobile number entry, then a 4-box OTP with auto-advance.
3. Any four digits pass. Landing screen depends on the role picked.

## Notes

- Auth screens (`s-` prefix) hide the app bar and the bottom nav.
- The role toggle in the app bar switches sides mid-flow, so one screen can play both phones. This is a demo device, not a product feature.
- No session, no token, no persistence. A refresh resets everything.

## Acceptance

- Both roles reach their dashboard from a cold start in under four taps.
- OTP boxes advance on input and accept any digits.

## Open for MVP

Real OTP delivery, retry and resend limits, session persistence, one account holding both roles.
