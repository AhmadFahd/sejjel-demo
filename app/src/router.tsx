import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { KEEP_MS } from '#/lib/freshness'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    /**
     * A hover preloads the screen; without a stale time the preload is spent
     * the instant it lands and the click pays for the same read again. Five
     * seconds covers the gap between the two, for a route that has not said
     * otherwise — #80's tiers each carry a preload window of their own,
     * because a preload window shorter than the stale time refetches a screen
     * the router already holds a fresh copy of. Freshness does not rest on
     * either: the event stream invalidates the loaders the moment a ledger
     * changes.
     */
    defaultPreloadStaleTime: 5_000,
    /**
     * #80: how long a screen a person has walked away from is kept, so coming
     * back to it a few minutes later paints from what the router already
     * holds rather than from the network. Five minutes is the router's own
     * default, said here so the policy does not move when the library's does.
     *
     * There is deliberately no `defaultStaleTime` beside it. Every route with
     * a loader picks a tier from `#/lib/freshness`, and the router's zero is
     * what a new one gets until somebody says which kind it is: a screen that
     * refetches too often is slow, and one that does not is wrong.
     */
    defaultGcTime: KEEP_MS,
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
