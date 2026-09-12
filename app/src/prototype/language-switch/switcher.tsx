import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { VARIANTS, usePrototypeVariant } from './slots'

/**
 * PROTOTYPE. The bar that flips between variants: deliberately ugly, so
 * nobody mistakes it for part of what is being judged. It appears in dev, and
 * on a deployed preview only once a `?variant=` is in the URL, so a visitor
 * to the demo never meets it.
 */
export function VariantSwitcher() {
  const { pathname, search } = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      search: state.location.search,
    }),
  })
  const current = usePrototypeVariant()

  const index = VARIANTS.findIndex((variant) => variant.key === current.key)
  const hrefFor = (step: number) => {
    const next = VARIANTS[(index + step + VARIANTS.length) % VARIANTS.length]
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(search)) {
      if (key !== 'variant') params.set(key, String(value))
    }
    params.set('variant', next.key)
    return `${pathname}?${params.toString()}`
  }

  // A full navigation rather than a client one: the language control is drawn
  // by the server too, and a variant that only half-applies is a variant
  // nobody can judge.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable === true
      if (typing) return
      if (event.key === 'ArrowLeft') window.location.assign(hrefFor(-1))
      if (event.key === 'ArrowRight') window.location.assign(hrefFor(1))
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const shown = import.meta.env.DEV || 'variant' in search
  if (!shown) return null

  return (
    <div
      dir="ltr"
      data-testid="prototype-switcher"
      className="fixed bottom-2 left-1/2 z-9999 flex -translate-x-1/2 items-center gap-1 rounded-full bg-fuchsia-600 px-1.5 py-1 text-white shadow-lg"
    >
      <a href={hrefFor(-1)} className="px-2 py-1 text-sm font-black">
        ←
      </a>
      <span className="px-1 text-[11px] font-black whitespace-nowrap">
        {current.key} · {current.name}
      </span>
      <a href={hrefFor(1)} className="px-2 py-1 text-sm font-black">
        →
      </a>
    </div>
  )
}
