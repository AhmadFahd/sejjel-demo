import { Outlet, createFileRoute } from '@tanstack/react-router'
import { loadSignedInUser } from '#/auth/session'
import { countUnreadFn } from '#/auth/notifications'
import { AmountsEye } from '#/components/amounts-eye'
import { NotificationsBell } from '#/components/notifications'
import { Dock } from '#/components/dock'
import { ProfileMenu } from '#/components/profile'
import { LedgerStream } from '#/components/ledger-stream'
import { useI18n } from '#/i18n/context'

/** The customer's side, with the same stream open behind it. */
export const Route = createFileRoute('/customer')({
  // Who is signed in for the profile, and what is unread for the bell. Both
  // belong to the dock, which is on every screen under here, so they are
  // asked for once rather than by each screen.
  loader: async () => {
    const [person, unread] = await Promise.all([
      loadSignedInUser(),
      countUnreadFn(),
    ])
    return { person, unread }
  },
  component: CustomerSide,
})

function CustomerSide() {
  const { t } = useI18n()
  const { person, unread } = Route.useLoaderData()

  return (
    <>
      <LedgerStream enabled />
      {/* The dock floats at the top of a desktop, where the bar used to hold
          the screen off. */}
      <div className="lg:pt-16">
        <Outlet />
      </div>
      <Dock
        items={[
          { to: '/customer', label: t('nav.ledger'), glyph: '▤' },
          { to: '/customer/card', label: t('nav.card'), glyph: '◧' },
        ]}
      >
        <NotificationsBell to="/customer/notifications" unread={unread} />
        <AmountsEye />
        <ProfileMenu person={person} side="customer" />
      </Dock>
    </>
  )
}
