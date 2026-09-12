import { Link, useMatchRoute } from '@tanstack/react-router'
import { cx } from './primitives'
import type { LinkProps } from '@tanstack/react-router'

export type DockItem = {
  to: LinkProps['to']
  label: string
  /** Carries the item on a phone, where only the chosen one is named. */
  glyph: string
}

/**
 * Where the app's navigation lives: one floating dock at every width, anchored
 * under the thumb on a phone and out of the content's way on a desktop. The
 * same control in both places rather than a bar on one and a bottom strip on
 * the other, so there is one thing to learn.
 */
export function Dock({ items }: { items: Array<DockItem> }) {
  const matchRoute = useMatchRoute()

  return (
    <>
      <nav
        data-testid="dock"
        // The band this nav lays across the screen is empty either side of the
        // dock, and an empty strip must not eat the presses meant for what is
        // under it.
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:top-2 lg:bottom-auto lg:pb-0"
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-card/90 p-1.5 shadow-(--shadow-card) backdrop-blur">
          {items.map((item) => {
            const here = Boolean(matchRoute({ to: item.to }))

            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={here ? 'page' : undefined}
                title={item.label}
                className={cx(
                  'flex items-center gap-2 rounded-full px-3 py-2 transition lg:px-4',
                  here ? 'bg-ink text-white' : 'text-muted',
                )}
              >
                <span className="text-base leading-none" aria-hidden>
                  {item.glyph}
                </span>
                {/* On a phone only the chosen one is named, so the dock stays
                    inside the width of a phone; a desktop names them all. */}
                <span
                  className={cx(
                    'text-[12.5px] font-black whitespace-nowrap lg:inline',
                    here ? 'inline' : 'hidden',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* The dock floats, so every screen under it ends above it rather than
          behind it. */}
      <div className="h-24 lg:h-4" />
    </>
  )
}
