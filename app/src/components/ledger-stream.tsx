import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { FALLBACK_POLL_MS, fallbackAction } from '#/lib/freshness'
import { moves } from '#/lib/moves'
import type { EventKind } from '#/db/queries/events'

/** Every kind the ledger sends, so each arrives knowing what it is. */
const KINDS = [
  'purchase.recorded',
  'purchase.applied',
  'purchase.cancelled',
  'payment.received',
  'connection.requested',
  'connection.accepted',
  'terms.changed',
  'notification.added',
  'notification.read',
] as const satisfies ReadonlyArray<EventKind>

/**
 * #14: the client end of the stream. An event says something changed; this
 * re-fetches the route's data rather than reading anything out of the event,
 * so the screen is right even if an event arrives twice or not at all.
 *
 * Mounted once, for a signed-in person. A signed-out visitor has no stream:
 * the endpoint would refuse them, and the browser would keep retrying.
 */
export function LedgerStream({ enabled }: { enabled: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled) return

    /**
     * #89: an event re-reads the screens it moved. A screen that has not said
     * what moves it is re-read anyway, so this only ever spares a read that
     * could not have changed anything — the shell on every event, and a screen
     * that is about something else.
     */
    const refresh = (kind?: EventKind) =>
      void router.invalidate(
        kind
          ? { filter: (match) => moves(match.staticData.movedBy, kind) }
          : undefined,
      )

    if (typeof EventSource === 'undefined') {
      // No stream in this browser, so the timer is the only thing that will
      // ever say a balance moved.
      const blind = setInterval(refresh, FALLBACK_POLL_MS)
      return () => clearInterval(blind)
    }

    // A stream opened while the document is still loading counts as a
    // subresource that never finishes, so the tab spins forever and anything
    // waiting on `load` waits with it. It costs nothing to open a moment
    // later, once the document is done.
    let source: EventSource | null = null
    let poll: ReturnType<typeof setInterval> | null = null
    let stopped = false

    const open = () => {
      if (stopped) return
      source = new EventSource('/api/events')

      // An event without a name is one this app did not send, so it is
      // answered the blunt way rather than guessed at.
      source.addEventListener('message', () => refresh())
      for (const kind of KINDS) {
        source.addEventListener(kind, () => refresh(kind))
      }
    }

    // #80: the fallback asks only while the stream is not carrying events. It
    // used to fire on a timer whatever the stream was doing, which cost every
    // idle tab a round trip a minute to be told nothing had changed.
    const beat = () => {
      const action = fallbackAction(source?.readyState ?? null)
      if (action === 'nothing') return
      refresh()
      if (action === 'ask-and-reopen') {
        source?.close()
        source = null
        open()
      }
    }

    // A phone that slept did not hear anything while it was away, and its
    // connection is usually gone without the browser having noticed yet. So
    // coming back to the app is its own beat, whatever the timer thinks.
    const woken = () => {
      if (document.visibilityState !== 'visible') return
      refresh()
      // 2 is CLOSED: the browser gave up while the tab was away, so the
      // stream has to be opened again by hand.
      if (source?.readyState === 2) {
        source.close()
        source = null
        open()
      }
    }

    const start = () => {
      open()
      poll = setInterval(beat, FALLBACK_POLL_MS)
    }

    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    document.addEventListener('visibilitychange', woken)

    return () => {
      stopped = true
      window.removeEventListener('load', start)
      document.removeEventListener('visibilitychange', woken)
      if (poll) clearInterval(poll)
      source?.close()
    }
  }, [enabled, router])

  return null
}
