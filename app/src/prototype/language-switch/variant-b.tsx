import { useLocaleSwitch } from './use-locale-switch'
import type { VariantDefinition } from './slots'

/**
 * PROTOTYPE — Variant B: one floating button, the same one everywhere.
 *
 * The language leaves the chrome entirely and becomes a single round button
 * pinned to a corner, over the page rather than inside it. It is in the same
 * corner on the marketing page, on sign-in and on every signed-in screen, for
 * a visitor and for an account alike: one control, one place, learned once.
 *
 * It costs no layout — no band, no row, nothing reflows — and it is the only
 * variant where the answer to "where is the language" is one sentence.
 * The cost: it is chrome floating over a design, it has to dodge the dock on a
 * phone, and it sits under a sheet whenever one is open.
 */
export const variantB: VariantDefinition = {
  key: 'B',
  name: 'One floating globe, every screen',
  slots: { global: FloatingGlobe },
}

function FloatingGlobe() {
  const { short, label, ariaLabel, switchNow } = useLocaleSwitch()

  return (
    <button
      type="button"
      data-testid="locale-switch"
      aria-label={ariaLabel}
      title={label}
      onClick={() => void switchNow()}
      // Bottom-start on a phone: the dock floats bottom-centre and the
      // marketing page keeps its call to action across the bottom, so the
      // corner is the one piece of that edge nothing else wants. A desktop
      // has no thumb to reach with, so it moves to the top corner, opposite
      // where the dock sits up there.
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] start-4 z-50 grid size-12 place-items-center rounded-full border border-line bg-card/90 leading-none shadow-(--shadow-card) backdrop-blur transition active:scale-95 lg:top-3 lg:bottom-auto lg:start-auto lg:end-4"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
      </svg>
      <span className="mt-0.5 text-[10px] font-black text-ink">{short}</span>
    </button>
  )
}
