import { useRouterState } from '@tanstack/react-router'
import { variantA } from './variant-a'
import { variantB } from './variant-b'
import { variantC } from './variant-c'
import type { ReactNode } from 'react'

/**
 * PROTOTYPE. Where a variant is allowed to put the language control. Every
 * surface that could plausibly hold one offers a slot; a variant fills the
 * ones its idea calls for and leaves the rest empty.
 */
export type Slot =
  | 'marketing-header'
  | 'marketing-footer'
  | 'signin-hero'
  | 'signin-sheet'
  | 'appbar'
  /** Drawn by the shell, so it lands on every screen including /status. */
  | 'global'

export type VariantDefinition = {
  key: string
  name: string
  slots: Partial<Record<Slot, () => ReactNode>>
}

export const VARIANTS: Array<VariantDefinition> = [variantA, variantB, variantC]

export const DEFAULT_VARIANT_KEY = 'A'

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

/** The one line a real screen has to carry while this question is open. */
export function LanguageSlot({ slot }: { slot: Slot }) {
  const variant = usePrototypeVariant()
  const Control = variant.slots[slot]
  return Control ? <Control /> : null
}
