# Prototype: no app bar after login

**Throwaway.** Nothing here is meant to survive. Delete the folder and
`src/routes/prototype-profile.tsx` once a variant has won, and write the
winner properly.

## What is settled, and what is not

Settled, and no longer part of the prototype:

- The marketing page keeps the pill in its own dark header, as it is.
- On sign-in the language moves **into the bottom sheet**, under the grabber
  and above whichever step is being asked, so it is on both the number step
  and the code step. The hero is left alone.

Open: the dark bar across the top of every signed-in screen goes, and
everything it carried — the language, the other side of the ledger, the
shop's settings, the way out — has to live somewhere. Three answers,
switchable with `?variant=D|E|F`.

## Run it

```
npm run dev
```

Sign in, then walk the same variant across the signed-in screens:

- `/customer?variant=D`, `/merchant?variant=D`
- an inner screen too, e.g. `/customer/card?variant=D`, where the bar used to
  be the only thing at the top

The pink bar at the bottom flips between variants (`←`/`→` also work). It
shows in dev, and on a deployed preview only when a `?variant=` is already in
the URL.

## The variants

**D — The dock carries the person.** No top chrome at all, at any width. The
dock grows a last pill for the person, and it opens a panel against itself:
upward on a phone, downward on a desktop, where the dock lives at the top.
One place for every control the app has. The panel hangs off a dock only as
wide as its items, so it is anchored rather than centred.

**E — The profile is a screen.** The dock gains a destination instead of a
menu. The rows are cards, like every other list in the app, and you leave it
the way you leave any screen. An app with a dock has places, not menus — but
switching language becomes a trip away from what you were reading.

**F — A floating avatar in the corner.** One round avatar where the bar used
to end, opening the app's own bottom sheet. Nothing to learn, because that
corner is where an account has always lived. It is the only variant that
still puts something at the top of every screen.

## What to look at

- An inner screen (`/customer/card`, `/merchant/record`). Without the bar the
  page starts at the very top; the back link and the h1 now carry it alone.
- A desktop, where the dock floats at the top and the bar used to hold the
  content off it. Each variant reserves that space itself.
- The sign-in sheet on the code step, where the language sits above a row of
  code boxes that takes focus on arrival.

## Known rough edges

- The profile asks the server who is signed in when it opens, rather than
  taking it from the route's loader. A real one would not need the round
  trip; it just saved plumbing the same data into three different places.
- The app's mark and name appear on no signed-in screen in any of the three.
  That is the point, and it is the thing to check you are happy about.
- Variant E's profile screen sits outside the customer and merchant trees, so
  the dock is not on it and the back link is the only way off. A real one
  would be nested inside the side it belongs to.
- `/design` still draws the app bar whatever the variant says: it is a page
  about the components themselves.
- The e2e suite now opens the profile before pressing sign out, settings or
  the language. Those tests pass on all three variants; they were written
  against the bar, and the helper is the whole difference.
