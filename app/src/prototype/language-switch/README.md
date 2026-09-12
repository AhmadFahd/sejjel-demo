# Prototype: where the language switch lives

**Throwaway.** Nothing here is meant to survive. Delete the folder once a
variant has won, and rewrite the winner properly in the real components.

## The question

The white band across the top of every screen that holds nothing but a
language pill should not exist. So where does the language switch go — for a
visitor who is not signed in (marketing page, sign-in) and for somebody who
is, on a phone and on a desktop?

Three variants, switchable with `?variant=A|B|C`, rendered on the real
screens rather than in a mock: the marketing header and footer, the sign-in
hero and its sheet, the AppBar, and a shell-level slot that reaches every
screen.

## Run it

```
npm run dev
```

Then walk the same variant across all three surfaces:

- `http://localhost:3000/?variant=A` — marketing, desktop and at 390px wide
- `http://localhost:3000/sign-in?variant=A` — anonymous
- sign in, then `http://localhost:3000/customer?variant=A` — signed in

The pink bar at the bottom flips between variants (`←`/`→` also work). It
shows in dev, and on a deployed preview only when a `?variant=` is already in
the URL, so a visitor to the demo never sees it.

Signing in locally needs the seeded numbers and the fixed OTP the dev
environment is configured with; the e2e suite's numbers work.

## The variants

**A — Beside the existing controls.** No new surface anywhere. Every screen
already has a row of controls at the top, so the language joins whichever one
the screen has: the marketing header, the sign-in hero opposite the mark, the
AppBar beside the side switch and sign out. On a phone the AppBar version
shrinks to two letters, because the mark plus three pills will not cross
360px. Nothing floats, nothing reflows, and the band disappears because
nothing needed it.

**B — One floating globe, every screen.** The language leaves the chrome and
becomes a single round button in a corner — bottom-start on a phone, top-end
on a desktop — identical on every screen, signed in or not. One control, one
place, learned once, and it costs no layout at all. It does float over the
design, it has to dodge the dock, and a sheet covers it.

**C — Asked once, then a setting.** Treats the language as a decision rather
than a control. A first-time visitor, meaning one whose choice we do not
already hold, is offered the other language once in a strip they take or
dismiss; after that it lives in the footer's small print on the public pages
and behind the account button when signed in. Loud at the one moment it
matters, quiet everywhere else — at the price of making a change of mind
something you have to go looking for.

## What to look at

- A phone at 360–390px, signed in, for somebody who is both merchant and
  customer: that AppBar carries the most.
- Both directions. The whole document flips, so a corner in Arabic is the
  other corner in English.
- The sign-in screen in Arabic while pretending you cannot read it. Every
  variant labels the switch in the language it switches _to_, so the word is
  always readable — the question is whether you can find it.

## Known rough edges

- `src/components/locale-toggle.tsx` is no longer imported by anything. The
  winner replaces it.
- The signed-in e2e test clicks `locale-switch` directly, which under variant
  C is behind the account sheet. The default (A) keeps the suite green; C
  would need the test to open the sheet first. Not worth fixing for a
  prototype.
- Variant C reads the locale cookie on the client to decide whether it has
  been asked before, so the strip appears a beat after the page paints.
