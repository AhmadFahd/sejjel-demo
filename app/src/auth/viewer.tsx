import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

/**
 * What the whole document knows about whoever is looking at it, which today
 * is only whether they are signed in. The shell controls that carry — the
 * eye over the amounts — appear for a person and not for a visitor.
 */
const ViewerContext = createContext<{ signedIn: boolean }>({ signedIn: false })

export function ViewerProvider({
  signedIn,
  children,
}: {
  signedIn: boolean
  children: ReactNode
}) {
  return (
    <ViewerContext.Provider value={{ signedIn }}>
      {children}
    </ViewerContext.Provider>
  )
}

export function useViewer() {
  return useContext(ViewerContext)
}
