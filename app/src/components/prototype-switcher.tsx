import { useCallback, useEffect } from 'react'

export type PrototypeVariantLabel = { key: string; name: string }

/**
 * The bar that flips between prototype variants. Deliberately ugly and
 * obviously not part of whatever is being judged above it, and gone from a
 * production build, so a prototype that gets merged by accident cannot show
 * its scaffolding to a customer.
 */
export function PrototypeSwitcher({
  variants,
  current,
  onSelect,
}: {
  variants: Array<PrototypeVariantLabel>
  current: string
  onSelect: (key: string) => void
}) {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  )

  const step = useCallback(
    (delta: number) => {
      onSelect(
        variants[(index + delta + variants.length) % variants.length].key,
      )
    },
    [index, onSelect, variants],
  )

  useEffect(() => {
    if (import.meta.env.PROD) return

    const onKey = (event: KeyboardEvent) => {
      // Arrow keys belong to whatever is being typed into.
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable]')) return
      if (event.key === 'ArrowLeft') step(-1)
      if (event.key === 'ArrowRight') step(1)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  if (import.meta.env.PROD) return null

  const shown = variants[index]
  const arrow =
    'grid size-8 place-items-center rounded-full bg-white/15 text-base leading-none text-white transition active:scale-95'

  return (
    <div
      dir="ltr"
      data-testid="prototype-switcher"
      className="fixed inset-x-0 bottom-4 z-100 flex justify-center"
    >
      <div className="flex items-center gap-2 rounded-full bg-black/85 px-2.5 py-2 font-mono text-[12px] text-white shadow-2xl ring-1 ring-white/20">
        <button
          type="button"
          aria-label="Previous variant"
          className={arrow}
          onClick={() => step(-1)}
        >
          ‹
        </button>
        <span className="px-1 whitespace-nowrap">
          <b className="font-bold">{shown.key}</b>
          {` (${shown.name})`}
          <span className="ms-2 text-white/45">
            {index + 1}/{variants.length} · ← →
          </span>
        </span>
        <button
          type="button"
          aria-label="Next variant"
          className={arrow}
          onClick={() => step(1)}
        >
          ›
        </button>
      </div>
    </div>
  )
}
