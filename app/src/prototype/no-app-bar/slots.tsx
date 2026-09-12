import { useRouterState } from '@tanstack/react-router'
import { variantD } from './variant-d'
import { variantE } from './variant-e'
import { variantF } from './variant-f'
import type { ReactNode } from 'react'

/**
 * PROTOTYPE. Where a variant is allowed to put the chrome that the app bar
 * used to hold. The marketing page and the sign-in sheet are settled and do
 * not vary: the only open question is what a signed-in screen looks like with
 * no bar across the top of it.
 */
export type Slot =
  /** Inside the floating dock, after its navigation items. */
  | 'dock'
  /** Drawn by the shell, above every screen. */
  | 'global'

export type VariantDefinition = {
  key: string
  name: string
  /** Every variant of this question hides it; the flag keeps that explicit. */
  hidesAppBar?: boolean
  slots: Partial<Record<Slot, () => ReactNode>>
}

export const VARIANTS: Array<VariantDefinition> = [variantD, variantE, variantF]

export const DEFAULT_VARIANT_KEY = 'D'

/** Which variant the URL is asking for, defaulting to the first. */
export function usePrototypeVariant(): VariantDefinition {
  const asked = useRouterState({
    select: (state) => {
      const search = state.location.search as Record<string, unknown>
      return typeof search.variant === 'string'
        ? search.variant.toUpperCase()
        : null
    },
  })

  return (
    VARIANTS.find((variant) => variant.key === asked) ??
    VARIANTS.find((variant) => variant.key === DEFAULT_VARIANT_KEY) ??
    VARIANTS[0]
  )
}

export function useAppBarHidden() {
  const hidden = usePrototypeVariant().hidesAppBar === true
  // The gallery is a page about the components themselves, so it draws the
  // bar whatever a variant thinks of it.
  const gallery = useRouterState({
    select: (state) => state.location.pathname === '/design',
  })

  return hidden && !gallery
}

/** The one line a real component has to carry while this question is open. */
export function ChromeSlot({ slot }: { slot: Slot }) {
  const variant = usePrototypeVariant()
  const Control = variant.slots[slot]
  return Control ? <Control /> : null
}
