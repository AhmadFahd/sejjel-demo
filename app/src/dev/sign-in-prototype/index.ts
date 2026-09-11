import { VariantCurrent } from './variant-a-current'
import { VariantKeypad } from './variant-b-keypad'
import { VariantOneScreen } from './variant-c-one-screen'
import { VariantSheet } from './variant-d-sheet'
import type { SignInVariant } from './shared'

/**
 * PROTOTYPE, throwaway. Four sign-in screens on the real `/sign-in` route,
 * switchable with `?variant=`, answering one question: what should signing in
 * feel like?
 *
 * The route keeps the state machine, the number normalising and both
 * mutations; a variant is rendering and nothing else, so every one of them
 * signs a real seeded person in against the real codes. `A` is today's screen
 * and what renders with no `?variant=`, so the browser tests keep testing the
 * design that ships.
 *
 * Nothing here belongs in the app. When a variant wins, it gets written again
 * properly in `src/routes/sign-in.tsx` and this folder goes away with the
 * switcher.
 */
export const SIGN_IN_VARIANTS: Array<SignInVariant> = [
  { key: 'A', name: 'Today', Component: VariantCurrent },
  { key: 'B', name: 'Keypad, no keyboard', Component: VariantKeypad },
  { key: 'C', name: 'One screen, six boxes', Component: VariantOneScreen },
  { key: 'D', name: 'Brand backdrop, sheet', Component: VariantSheet },
]

/** An unknown or missing `?variant=` is today's screen. */
export function resolveVariant(key: string | undefined) {
  return (
    SIGN_IN_VARIANTS.find((variant) => variant.key === key) ??
    SIGN_IN_VARIANTS[0]
  )
}
