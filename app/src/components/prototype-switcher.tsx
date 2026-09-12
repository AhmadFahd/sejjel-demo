import { useEffect } from 'react'
import { cx } from './primitives'

/**
 * PROTOTYPE SCAFFOLDING — throwaway. The bar that flips between variants of a
 * screen while it is being decided on. It is deliberately ugly and out of the
 * brand, so nobody mistakes it for part of the design under the cursor, and it
 * renders nothing in a production build.
 */
export type Variant = { key: string; name: string }

export function PrototypeSwitcher({
  variants,
  current,
  chosen,
  onPick,
}: {
  variants: Array<Variant>
  current: string
  /**
   * Whether a variant was asked for by name. A deployed preview is where most
   * of the looking happens, so the bar is there too — but only for somebody
   * who already has `?variant=` in the URL, so nobody meets it by accident.
   */
  chosen: boolean
  onPick: (key: string) => void
}) {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  )
  const step = (delta: number) =>
    onPick(variants[(index + delta + variants.length) % variants.length].key)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      // Somebody typing in a field is moving a caret, not a variant.
      const target = event.target as HTMLElement | null
      if (
        target?.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return
      }
      step(event.key === 'ArrowRight' ? 1 : -1)
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  if (import.meta.env.PROD && !chosen) return null

  const variant = variants[index]

  return (
    <div
      // The switcher reads left to right whichever way the page runs: the
      // arrows point at positions in a list, not at earlier and later text.
      dir="ltr"
      data-testid="prototype-switcher"
      className="fixed bottom-4 left-1/2 z-200 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/85 p-1 font-mono text-[12px] text-white shadow-2xl backdrop-blur"
    >
      <Arrow label="Previous variant" onClick={() => step(-1)}>
        ‹
      </Arrow>
      <span className="px-2 whitespace-nowrap tabular-nums">
        <b>{variant.key}</b> · {variant.name}
        <span className="ps-2 text-white/40">
          {index + 1}/{variants.length}
        </span>
      </span>
      <Arrow label="Next variant" onClick={() => step(1)}>
        ›
      </Arrow>
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
        'grid size-7 place-items-center rounded-full text-base leading-none',
        'bg-white/10 hover:bg-white/25',
      )}
    >
      {children}
    </button>
  )
}
