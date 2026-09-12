import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { loadSignedInUser } from '#/auth/session'
import { homeFor } from '#/auth/roles'
import { buttonClass } from '#/components/chrome'
import { Card } from '#/components/primitives'
import { ConnectionRequests } from '#/components/connection-requests'
import { LedgerStream } from '#/components/ledger-stream'
import { useI18n } from '#/i18n/context'

const loadRequests = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSignedInUser } = await import('#/auth/session.server')
  const { getDatabase } = await import('#/db/client')
  const { listConnectionRequests } = await import('#/db/queries/connect')
  const user = await requireSignedInUser()

  return { requests: await listConnectionRequests(getDatabase(), user.id) }
})

/** For a person no shop has connected, who does not keep one either. */
export const Route = createFileRoute('/welcome')({
  beforeLoad: async () => {
    const user = await loadSignedInUser()
    if (!user) throw redirect({ to: '/sign-in' })

    const home = homeFor(user.roles)
    if (home !== '/welcome') throw redirect({ to: home })
  },
  loader: () => loadRequests(),
  component: Welcome,
})

function Welcome() {
  const { requests } = Route.useLoaderData()
  const { t } = useI18n()

  return (
    <main className="mx-auto max-w-sm px-6 py-10">
      {/* A shop asking for this person is the other way off this screen, and
          it arrives while they are looking at it. */}
      <LedgerStream enabled />
      <ConnectionRequests requests={requests} />

      <Card>
        <h1 className="mb-2 text-xl font-black text-ink">
          {t('welcome.title')}
        </h1>
        <p className="mb-4 text-[13px] font-bold text-muted">
          {t('welcome.body')}
        </p>
        <Link
          to="/merchant/new"
          className="inline-block rounded-(--radius-control) bg-brand px-4 py-2.5 text-[13px] font-black text-white"
        >
          {t('welcome.openShop')}
        </Link>
      </Card>

      <Link
        to="/customer/card"
        className={buttonClass('ghost')}
        data-testid="my-card-link"
      >
        {t('card.open')}
      </Link>
    </main>
  )
}
