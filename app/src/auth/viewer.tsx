import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'

/**
 * What the whole document knows about whoever is looking at it: whether they
 * are signed in, so the shell controls that carry — the eye over the amounts —
 * appear for a person and not for a visitor, and the way to turn the amounts
 * over, which the eye presses and the formatter reads.
 */
const ViewerContext = createContext<{
  signedIn: boolean
  /** #88: what a press of the eye does, on the screen, before the row knows. */
  hideAmounts: (hidden: boolean) => void
}>({ signedIn: false, hideAmounts: () => undefined })

export function ViewerProvider({
  signedIn,
  hideAmounts,
  children,
}: {
  signedIn: boolean
  hideAmounts: (hidden: boolean) => void
  children: ReactNode
}) {
  const value = useMemo(
    () => ({ signedIn, hideAmounts }),
    [signedIn, hideAmounts],
  )

  return (
    <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
  )
}

export function useViewer() {
  return useContext(ViewerContext)
}
