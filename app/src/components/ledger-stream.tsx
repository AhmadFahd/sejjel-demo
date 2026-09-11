import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'

/** How often to re-fetch anyway, for a stream that died without saying so. */
const FALLBACK_POLL_MS = 60_000

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
    if (!enabled || typeof EventSource === 'undefined') return

    const refresh = () => void router.invalidate()
    const source = new EventSource('/api/events')

    // Every kind matters to some screen, and re-fetching is cheap, so one
    // listener for all of them rather than a list to keep in step.
    source.addEventListener('message', refresh)
    for (const kind of [
      'purchase.recorded',
      'purchase.applied',
      'purchase.cancelled',
      'payment.received',
      'connection.requested',
      'connection.accepted',
      'terms.changed',
    ]) {
      source.addEventListener(kind, refresh)
    }

    const poll = setInterval(refresh, FALLBACK_POLL_MS)

    return () => {
      clearInterval(poll)
      source.close()
    }
  }, [enabled, router])

  return null
}
