/**
 * #80: how long a screen's last answer may stand, and what happens when the
 * stream that keeps it honest goes quiet.
 *
 * The router's own default is zero, which means every navigation refetches and
 * a screen somebody left two seconds ago is rebuilt from the network. Three
 * tiers instead, one of which every route with a loader picks, so a new screen
 * has to say which kind it is rather than inherit an answer.
 *
 * What makes a stale window safe here is the event stream: anything that moves
 * a figure records an event, and an event invalidates every loaded and cached
 * screen whatever its stale time. So the window below only ever runs while
 * nothing has changed — and `fallbackAction` covers the case where the stream
 * has stopped saying so.
 */

/** A window long enough to cover a look and a look back, short enough that a
 * dead stream cannot hide a balance for long. */
const WATCHED_MS = 30_000

/**
 * A screen whose figures somebody else can move: a balance, a history, a list
 * of what is waiting. Coming back inside the window paints the last answer and
 * asks nothing; past it, the last answer still paints and the next one arrives
 * behind it, because the router reloads a screen it already has in the
 * background rather than in front of it.
 *
 * The preload window matches the stale one on purpose. They are separate
 * settings, and a shorter preload window would refetch on a hover over a
 * screen the router already holds a fresh copy of.
 */
export const WATCHED = {
  staleTime: WATCHED_MS,
  preloadStaleTime: WATCHED_MS,
} as const

/**
 * A screen nobody but its own reader changes: the shop's own settings, its
 * printed code, an issued invoice, who is signed in. A write from the screen
 * itself invalidates it, and so does an event, so there is nothing left for a
 * timer to catch.
 */
export const SETTLED = {
  staleTime: Infinity,
  preloadStaleTime: Infinity,
} as const

/**
 * A screen whose answer is minted when it is read, or acted on the moment it
 * is: the card's code, an operation waiting to be approved, an amount about to
 * be paid. Fresh every visit, and never painted from the last visit's answer —
 * `gcTime: 0` keeps nothing to paint, so the visit waits for the real thing.
 *
 * Preloading is off for the same reason: a hover would mint a code that the
 * tap a moment later has to throw away, and a code minted on hover is older
 * than the screen it lands on.
 */
export const MINTED = {
  staleTime: 0,
  gcTime: 0,
  preload: false,
} as const

/**
 * How long a screen the reader has walked away from is kept, so coming back to
 * it a few minutes later paints from what the router still holds. Five minutes
 * is the router's own default, said out loud here so the policy does not move
 * when the library's does.
 */
export const KEEP_MS = 5 * 60_000

/** How often to ask anyway, while the stream is not carrying events. */
export const FALLBACK_POLL_MS = 60_000

/**
 * What a beat of the fallback should do, given what the stream is doing.
 *
 * With the stream open there is nothing to do: the server sweeps the events
 * table behind every wake, so a quiet stream means nothing has changed rather
 * than nothing has been delivered. A timer that refetches anyway costs every
 * idle tab a round trip a minute and can only ever return what the screen
 * already has.
 *
 * `null` is a browser with no `EventSource` at all, which never had a stream
 * to lose.
 */
export function fallbackAction(
  readyState: number | null,
): 'nothing' | 'ask' | 'ask-and-reopen' {
  // 1 is OPEN. The constant lives on the class, which the server does not have.
  if (readyState === 1) return 'nothing'
  // 2 is CLOSED: the browser has given up retrying, so nothing will arrive
  // again until a new stream is opened. One we open ourselves cannot resume
  // from where the last one stopped — the browser only sends Last-Event-ID on
  // its own reconnect — so the ask is what covers the gap.
  if (readyState === 2) return 'ask-and-reopen'
  // 0 is CONNECTING, and a beat away from opening is a beat of not hearing.
  return 'ask'
}
