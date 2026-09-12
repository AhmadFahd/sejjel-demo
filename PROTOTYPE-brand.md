# Prototype — the identity on the public page

**Throwaway.** Everything named here goes once one of the variants wins. Read
this before deleting anything, then delete all of it.

## The question

`brand/identity-ar.html` fixes the logo, three colours, one typeface and two
textures. Nothing in the app is built from it. What does the app's most
exposed surface look like when it is?

## How to look

```
cd app && npm run dev
```

Then open <http://localhost:3000/> and flip with the bar at the bottom of the
screen, or the left and right arrow keys. The variant rides in the URL, so a
link to one is a link to that one:

| `?variant=` |                                                              |
| ----------- | ------------------------------------------------------------ |
| _(none)_    | the page as it stands today, for comparison                  |
| `paper`     | **الورق** — a document. Rules, not cards.                    |
| `field`     | **الحقل** — green at full strength, the icon at poster size. |
| `ledger`    | **الدفتر** — the sheet is the pitch.                         |

The bar shows in dev, and on a deployed preview only once a `?variant=` is in
the URL — so it is there for the looking, and nobody meets it by accident.

## What each one argues

**الورق.** A ledger is a document, so the page that sells one reads like a
document: bone ground, one measured column, hairline rules, numbered claims,
and a sign-in that is a sentence rather than a slab. Nothing drawn on the page
but the logo. The quietest of the three, and the closest to the guide's own
voice.

**الحقل.** The icon is strong enough to carry a page alone. Green fills half
the screen with the check at poster size on it; the words sit on a bone panel
that interlocks with it. The loudest, and the only one that would be
recognisable from across a room.

**الدفتر.** No picture of the product beside the pitch — the sheet _is_ the
pitch. A page of a real ledger, ruled, with each documented line stamped by the
icon and each line still waiting for the other side left unstamped. The last
line of the sheet is the way in. Two colours the whole way down.

## What is scaffolding and what is worth keeping

Keep, whichever variant wins:

- `app/src/components/brand.tsx` — the wordmark, the icon and the two textures
  as components, with the guide's rules built into them (the icon's two parts
  never separate, the logo goes single-colour bone on green, the textures hold
  their fixed low contrast). Paths come from `logo.svg` and `icon.svg`, which
  the guide names as the only permitted origin.
- The palette in `app/src/styles.css`, which is now the guide's.

Throw away:

- `app/src/routes/-landing-brand/` — the three variants. The `-` prefix keeps
  the directory out of the route tree.
- `app/src/components/prototype-switcher.tsx`.
- The `variant` search parameter and the switch in `app/src/routes/index.tsx`.

Fold the winner in by rewriting it, not by promoting it: it was written under
prototype rules — no tests, no error handling, no reuse.

## What the prototype turned up about the app as it stands

Four things. Three were conflicts with the guide and are fixed in code; the
fourth was a gap in the guide, and is settled there.

**Fixed — the letters have their own colour again.** `--color-ink` was the
check's green, so every heading, every amount and every avatar in the app was
the mark's colour. It is now the guide's brown, `#5C4F4A`, and the green
belongs to the mark and to the reversed ground — `bg-brand`, which is what the
dark surfaces (the landing hero, the sign-in backdrop, the balance card, the
active pill in the dock) are built from. `--color-steel` and `--color-mist`
were the same two colours under other names and are gone; the palette is the
guide's three, `--color-ink`, `--color-brand`, `--color-bone`.

**Fixed — the gold is gone.** It was carrying the landing hero, the primary
call to action, the payday strip and the "outstanding" figure, and the guide
allows no colour from outside its three. What each use became:

| was                                        | is                   | why                                                 |
| ------------------------------------------ | -------------------- | --------------------------------------------------- |
| the letter in a gold tile, three screens   | the icon itself      | it was standing in for a logo the project has       |
| the gold gradient call to action           | bone on green        | the guide's reversed pairing                        |
| the payday strip                           | a green-tinted panel | a due date is information, not an alarm             |
| the "outstanding" tile                     | the brand green      | still apart from a plain figure, inside the palette |
| the balance card's green-to-green gradient | one flat green       | the second green was nobody's colour                |
| the limit bar's gold stretch               | the warn tone        | see below                                           |

**Fixed — three weights, not five.** `font-extrabold` (800) was used
throughout, and the stylesheet was loading a 600 nobody asked for. Every 800
is now 700, the one 500 is 700, and the font loads 400, 700 and 900 — the
three the guide names.

**Fixed — the wordmark serves both languages, on purpose.** It is Arabic-only,
so the English side of the app shows the Arabic one. Drawing a Latin companion
would be new brand artwork, which the guide forbids and sends to whoever owns
the brand; that decision has now been taken, and it is to keep the Arabic
wordmark in both languages — a mark is a drawing, not a word to be carried
from one tongue to another. The guide says so now, in section 2 and in the
short version's rules, so the next reader meets it as a decision rather than
as an omission. No code changed: the app already did this, and now it does it
on purpose.

## What was deliberately left alone

The status palette — good, warn, bad, info. It is functional colour: what a
figure is doing, not who it belongs to. The guide governs the brand's three
colours and says nothing about telling an overdue account from a settled one,
and an app that cannot go red when a payment is late has lost something real.
So the limit bar still runs green to amber to red, overdue is still red, and
only الدفتر among the variants tries doing without it.

White, too. Cards are white on the bone ground, and text on the green is
white. Those are neutrals rather than a fourth colour.
