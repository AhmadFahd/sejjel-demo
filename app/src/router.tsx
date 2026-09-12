import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    /**
     * A hover preloads the screen; without a stale time the preload is spent
     * the instant it lands and the click pays for the same read again. Five
     * seconds covers the gap between the two. Freshness does not rest on it:
     * the event stream invalidates the loaders the moment a ledger changes.
     */
    defaultPreloadStaleTime: 5_000,
    /**
     * #75: there is deliberately no pending component here or on any route. A
     * pending component replaces the match it stands in front of, which
     * unmounts the screen, and these screens hold the operation being
     * recorded, the code just agreed to and the search being typed in their
     * own state. The browser suite caught what that costs. `LoadingBar` in
     * the shell says a screen is coming without taking away the one that is
     * there, and `LoadingDots` does the same for one part of a screen.
     */
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
