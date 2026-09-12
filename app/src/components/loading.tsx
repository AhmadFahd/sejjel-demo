import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useI18n } from '#/i18n/context'

/** How long a wait has to last before it is worth saying anything. */
const SHOW_AFTER_MS = 120

/**
 * #75: the app's one loader. A hairline across the top of the screen for as
 * long as the router is busy, mounted once in the shell, so every screen
 * answers a tap whether or not its data has arrived.
 *
 * It draws over the screen rather than in place of it, on purpose. TanStack's
 * own answer to a pending screen is a `pendingComponent`, which replaces the
 * match it stands in front of and so unmounts it; the screens here carry the
 * operation being recorded, the code just agreed to and the search being
 * typed in their own state, and losing that mid-flow is worse than a wait
 * nobody was told about. So nothing is replaced: the screen a person is
 * looking at stays, and this says that a newer one is on its way.
 *
 * It is also up while the first round trip of a navigation is still out, which
 * is the part a pending component cannot reach at all (#79).
 */
export function LoadingBar() {
  const busy = useRouterState({ select: (state) => state.isLoading })
  const { t } = useI18n()
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!busy) {
      setShown(false)
      return
    }

    // A navigation that answers at once draws nothing at all.
    const timer = setTimeout(() => setShown(true), SHOW_AFTER_MS)
    return () => clearTimeout(timer)
  }, [busy])

  if (!shown) return null

  return (
    <div
      role="status"
      aria-label={t('loading')}
      data-testid="loading-bar"
      className="fixed inset-x-0 top-0 z-90 h-0.5 animate-pulse bg-brand motion-reduce:animate-none"
    />
  )
}

/**
 * The same loader where the wait belongs to one part of a screen rather than
 * the whole of it: a regenerated card code, a page of the log. Small enough
 * to sit in a line of text.
 */
export function LoadingDots() {
  const { t } = useI18n()

  return (
    <span
      role="status"
      aria-busy
      aria-label={t('loading')}
      data-testid="loading-dots"
      className="inline-flex items-center gap-1.5"
    >
      {[0, 140, 280].map((delayMs) => (
        <span
          key={delayMs}
          style={{ animationDelay: `${delayMs}ms` }}
          className="size-2 animate-pulse rounded-full bg-brand/50 motion-reduce:animate-none"
        />
      ))}
    </span>
  )
}
