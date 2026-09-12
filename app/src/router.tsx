import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { Loading } from './components/loading'
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
     * #75: one loader for every screen, so none of them can sit blank while
     * its data is on the way. It waits 150ms before it appears, which is
     * longer than a navigation that had its answer already, and stays 300ms
     * once it has, so it cannot flash and be gone. The router's own defaults
     * are 1000 and 500, and with no component to draw the screen just froze.
     */
    defaultPendingComponent: Loading,
    defaultPendingMs: 150,
    defaultPendingMinMs: 300,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
