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
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
