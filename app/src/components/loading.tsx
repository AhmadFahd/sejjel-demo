import { cx } from './primitives'
import { useI18n } from '#/i18n/context'

/**
 * #75: the one loader in the app. Every screen is a stack of cards, so what
 * stands in for a screen that has not arrived yet is a stack of cards with
 * nothing in them. The router draws it inside the layout the screen would
 * have filled, so the dock and the header stay where they are and only the
 * content area changes.
 *
 * Late and brief on purpose: the router holds it back 150ms, so a navigation
 * that answers quickly never shows it, and keeps it 300ms once it is up, so
 * it cannot flash. Those two numbers are in `router.tsx`.
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
