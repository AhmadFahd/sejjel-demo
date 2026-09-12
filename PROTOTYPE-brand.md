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
- The four tokens added to `app/src/styles.css`.

Throw away:

- `app/src/routes/-landing-brand/` — the three variants. The `-` prefix keeps
  the directory out of the route tree.
- `app/src/components/prototype-switcher.tsx`.
- The `variant` search parameter and the switch in `app/src/routes/index.tsx`.

Fold the winner in by rewriting it, not by promoting it: it was written under
prototype rules — no tests, no error handling, no reuse.

## What the prototype turned up about the app as it stands

Four things, none of them fixed here, all of them larger than this page:

1. **`--color-ink` is the brand green.** The guide gives the letters their own
   brown (`#5C4F4A`) and reserves the green for the check. Today every
   heading, every amount and every avatar in the app is the check's colour.
2. **The gold is not in the palette.** `--color-gold` and its two shades carry
   the landing hero, the primary call to action, the payday strip and the
   "outstanding" figure. The guide allows three colours and says outright that
   no colour from outside them may be used — including colours from earlier
   versions of the mark.
3. **Weight 800 is everywhere.** The guide asks for three weights: 900, 700, 400. `font-extrabold` is 800 and appears throughout, and the font is loaded
   with a 600 as well.
4. **There is no Latin lockup.** The wordmark is Arabic-only, so the English
   side of the app has no logo of its own and borrows the Arabic one. The
   guide does not cover this; it needs a decision from whoever owns the brand.

The status palette (good/warn/bad/info) is a separate question. It is
functional colour rather than brand colour, and only الدفتر tries doing
without it.
