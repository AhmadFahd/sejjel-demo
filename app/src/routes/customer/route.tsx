import { Outlet, createFileRoute } from '@tanstack/react-router'
import { loadSignedInUser } from '#/auth/session'
import { Dock } from '#/components/dock'
import { ProfileMenu } from '#/components/profile'
import { LedgerStream } from '#/components/ledger-stream'
import { useI18n } from '#/i18n/context'

/** The customer's side, with the same stream open behind it. */
export const Route = createFileRoute('/customer')({
  // Who is signed in, for the profile in the dock. Asked for once here rather
  // than by each screen under it.
  loader: () => loadSignedInUser(),
  component: CustomerSide,
})

function CustomerSide() {
  const { t } = useI18n()
  const person = Route.useLoaderData()

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
        <ProfileMenu person={person} side="customer" />
      </Dock>
    </>
  )
}
