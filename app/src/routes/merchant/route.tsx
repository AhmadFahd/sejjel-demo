import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { enterApp } from '#/auth/enter'
import { AmountsEye } from '#/components/amounts-eye'
import { NotificationsBell } from '#/components/notifications'
import { Dock } from '#/components/dock'
import { ProfileMenu } from '#/components/profile'
import { LedgerStream } from '#/components/ledger-stream'
import { useI18n } from '#/i18n/context'

/**
 * Everything on the shop's side of the ledger, with the event stream open
 * behind it: a purchase the customer approves on their phone reaches this one
 * without anybody pulling to refresh.
 */
export const Route = createFileRoute('/merchant')({
  // #79: who is signed in for the profile and what is unread for the bell,
  // asked in the one hook that keeps its answer. A tap inside the side does
  // not ask again, and the screen's own loader is the only round trip left.
  // The side itself is each screen's own business: `requireSide` reads this
  // answer, because the card under here is open to anybody signed in.
  loader: () => enterApp(),
  // The answer is good until the stream says otherwise, which it does on
  // every notification, and the fallback poll behind it says so anyway.
  staleTime: Infinity,
  component: MerchantSide,
})

function MerchantSide() {
  const { t } = useI18n()
  const { person, unread } = Route.useLoaderData()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  // Opening a shop happens on this side of the tree but before there is a
  // shop, so the dock would point at screens its reader is sent back from.
  const opening = pathname === '/merchant/new'

  return (
    <>
      <LedgerStream enabled />
      {/* The dock floats at the top of a desktop, where the bar used to hold
          the screen off. */}
      <div className={opening ? undefined : 'lg:pt-16'}>
        <Outlet />
      </div>
      {opening ? null : (
        <Dock
          items={[
            { to: '/merchant', label: t('nav.shop'), glyph: '▤' },
            { to: '/merchant/record', label: t('nav.record'), glyph: '+' },
            { to: '/merchant/scan', label: t('nav.scan'), glyph: '⌗' },
          ]}
        >
          <NotificationsBell to="/merchant/notifications" unread={unread} />
          <AmountsEye />
          <ProfileMenu person={person} side="merchant" />
        </Dock>
      )}
    </>
  )
}
