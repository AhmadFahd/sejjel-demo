import { useLocaleSwitch } from './use-locale-switch'
import type { VariantDefinition } from './slots'

/**
 * PROTOTYPE — Variant A: beside the controls that are already there.
 *
 * No surface of its own anywhere. Every screen in this app already has a row
 * of controls at the top — the marketing header, the sign-in hero, the AppBar
 * — so the language goes into whichever of those the screen has. Nothing
 * floats, nothing is added, and the band of white at the top of the app goes
 * away because nothing needed it.
 *
 * The bet: a control used once in a lifetime does not deserve a surface, but
 * it does deserve to be visible, and the chrome can carry one more pill.
 * The cost: on a phone the AppBar can hold the mark, the side switch, sign out
 * and this — four things in 360px — so here it shrinks to two letters.
 */
export const variantA: VariantDefinition = {
  key: 'A',
  name: 'Beside the existing controls',
  slots: {
    'marketing-header': MarketingPill,
    'signin-hero': HeroPill,
    appbar: AppBarPill,
  },
}

function MarketingPill() {
  const { label, ariaLabel, switchNow } = useLocaleSwitch()

  return (
    <button
      type="button"
      data-testid="locale-switch"
      aria-label={ariaLabel}
      onClick={() => void switchNow()}
      className="rounded-full px-3 py-1.5 text-[12.5px] font-black text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      {label}
    </button>
  )
}

/** On the dark hero, opposite the mark, where the eye already goes. */
function HeroPill() {
  const { label, ariaLabel, switchNow } = useLocaleSwitch()

  return (
    <button
      type="button"
      data-testid="locale-switch"
      aria-label={ariaLabel}
      onClick={() => void switchNow()}
      className="rounded-full border border-white/25 px-4 py-1.5 text-[12.5px] font-black text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      {label}
    </button>
  )
}

/**
 * In the AppBar, in the same pill the side switch and sign out wear, so it
 * reads as one row of controls rather than a stranger among them.
 */
function AppBarPill() {
  const { label, short, ariaLabel, switchNow } = useLocaleSwitch()

  return (
    <button
      type="button"
      data-testid="locale-switch"
      aria-label={ariaLabel}
      onClick={() => void switchNow()}
      className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-black text-white"
    >
      {/* Four controls do not fit across a phone, so the narrow screen gets
          the two letters and the wide one gets the word. */}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{short}</span>
    </button>
  )
}
