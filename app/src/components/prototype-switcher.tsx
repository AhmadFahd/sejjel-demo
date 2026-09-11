import { useEffect } from 'react'
import { cx } from './primitives'

/**
 * PROTOTYPE ONLY. The bar that flips between variants of a throwaway screen.
 * It is deliberately loud and out of the design's palette, so nobody mistakes
 * it for part of what is being judged, and it is gone from a production build.
 *
 * Presentational on purpose: each prototype route owns its own typed
 * `navigate`, and hands the change back through `onChange`.
 */
export function PrototypeSwitcher<TKey extends string>({
  variants,
  current,
  onChange,
}: {
  variants: ReadonlyArray<{ key: TKey; name: string }>
  current: TKey
  onChange: (key: TKey) => void
}) {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  )

  useEffect(() => {
    const step = (by: number) => {
      onChange(variants[(index + by + variants.length) % variants.length].key)
    }

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      // Arrow keys belong to whatever is being typed into.
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return
      }
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, variants, onChange])

  if (import.meta.env.PROD) return null

  const step = (by: number) => {
    onChange(variants[(index + by + variants.length) % variants.length].key)
  }

  return (
    // Pinned to the end edge at mid-height, because the top and the bottom of
    // the screen are exactly what these prototypes are putting navigation in.
    <div
      dir="ltr"
      className="pointer-events-none fixed end-3 top-1/2 z-[200] -translate-y-1/2"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-fuchsia-400/40 bg-neutral-900 p-1 font-mono text-[12px] text-white shadow-2xl shadow-black/40">
        <Arrow label="Previous variant" onClick={() => step(-1)}>
          ←
        </Arrow>
        <span className="px-2 py-1.5 whitespace-nowrap">
          <b className="text-fuchsia-300">{current}</b>
          <span className="ms-2 hidden text-white/60 sm:inline">
            {variants[index].name}
          </span>
          <span className="ms-2 text-white/30">
            {index + 1}/{variants.length}
          </span>
        </span>
        <Arrow label="Next variant" onClick={() => step(1)}>
          →
        </Arrow>
      </div>
    </div>
  )
}

function Arrow({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        'grid size-8 place-items-center rounded-full text-base',
        'hover:bg-white/10 active:scale-95',
      )}
    >
      {children}
    </button>
  )
}
