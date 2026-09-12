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
     * #75: how long a screen's own loader waits before it appears, and how
     * long it stays once it has, so a navigation that answers quickly draws
     * nothing and a slow one cannot flash. The router's own defaults are 1000
     * and 500, which is long enough to look like nothing happened.
     *
     * There is deliberately no `defaultPendingComponent`. A pending component
     * replaces the screen it stands in front of, which unmounts it, and the
     * screens that hold an operation in their own state lose it when that
     * happens. So the screens that only read name `Loading` themselves, and
     * every screen gets `LoadingBar` from the shell instead.
     */
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
