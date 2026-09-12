import { Outlet, createFileRoute } from '@tanstack/react-router'
import { enterApp } from '#/auth/enter'
import { AmountsEye } from '#/components/amounts-eye'
import { NotificationsBell } from '#/components/notifications'
import { Dock } from '#/components/dock'
import { ProfileMenu } from '#/components/profile'
import { LedgerStream } from '#/components/ledger-stream'
import { useI18n } from '#/i18n/context'

/** The customer's side, with the same stream open behind it. */
export const Route = createFileRoute('/customer')({
  // Who is signed in for the profile, what is unread for the bell, and
  // whether this person is signed in at all: one question, before any screen
  // under here runs. Its answer is the context those screens read, so none of
  // them asks the server who is asking a second time.
  beforeLoad: () => enterApp(),
  component: CustomerSide,
})

function CustomerSide() {
  const { t } = useI18n()
  const { person, unread } = Route.useRouteContext()

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
