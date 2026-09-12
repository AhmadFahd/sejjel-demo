import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { cx } from './primitives'
import { useI18n } from '#/i18n/context'

/** How long a wait has to last before the bar is worth drawing. */
const BAR_AFTER_MS = 120

/**
 * #75: the app's one loader, for a screen that is not there yet. Every screen
 * is a stack of cards, so what stands in for one is a stack of cards with
 * nothing in them. The router draws it where the screen would have gone, so
 * the dock and the header stay put and only the content area changes.
 *
 * A route asks for this by name, rather than the router handing it to every
 * route: a pending component replaces the screen it stands in front of, which
 * unmounts it, and the screens that carry an operation in their own state
 * cannot afford that mid-flow. So the screens that only read wear it, and
 * everything else says it is working with `LoadingBar` and keeps what the
 * person was doing. The two numbers behind it, 150ms before it shows and
 * 300ms once it has, are in `router.tsx`.
 */
export function Loading({ rows = 3 }: { rows?: number }) {
  const { t } = useI18n()

  return (
    // A `div` and not a `main`: the screen this stands in for has the page's
    // one `main`, and it is about to draw it.
    <div
      role="status"
      aria-busy
      aria-label={t('loading')}
      data-testid="loading"
      className="p-3.5"
    >
      <Bar className="mb-3 h-6 w-32" />

      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="mb-3 rounded-(--radius-card) bg-card p-4 shadow-(--shadow-card)"
        >
          <Bar className="mb-3 h-4 w-1/2" delayMs={index * 120} />
          <Bar className="h-4 w-1/3" delayMs={index * 120 + 60} />
        </div>
      ))}
    </div>
  )
}

/**
 * The whole app's answer to a tap, on every screen: a hairline across the top
 * for as long as the router is busy. It replaces nothing and unmounts
 * nothing, so a half-typed operation survives it, and it is up while the
 * first round trip of a navigation is still out — the part no pending
 * component can cover (#79).
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
    const timer = setTimeout(() => setShown(true), BAR_AFTER_MS)
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
 * The same loader where a whole screen is not waiting: a regenerated card
 * code, a page of the log. Small enough to sit in a line of text.
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

/** A line of nothing, pulsing. The loader is made of these. */
function Bar({
  className,
  delayMs = 0,
}: {
  className: string
  delayMs?: number
}) {
  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={cx(
        'animate-pulse rounded-full bg-hairline/70 motion-reduce:animate-none',
        className,
      )}
    />
  )
}
