import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { loadSignedInUser } from '#/auth/session'
import { homeFor } from '#/auth/roles'
import { Card } from '#/components/primitives'
import { useI18n } from '#/i18n/context'

/** For a person no shop has connected, who does not keep one either. */
export const Route = createFileRoute('/welcome')({
  beforeLoad: async () => {
    const user = await loadSignedInUser()
    if (!user) throw redirect({ to: '/sign-in' })

    const home = homeFor(user.roles)
    if (home !== '/welcome') throw redirect({ to: home })
  },
  component: Welcome,
})

function Welcome() {
  const { t } = useI18n()

  return (
    <main className="mx-auto max-w-sm px-6 py-10">
      <Card>
        <h1 className="mb-2 text-xl font-black text-ink">
          {t('welcome.title')}
        </h1>
        <p className="mb-4 text-[13px] font-bold text-muted">
          {t('welcome.body')}
        </p>
        <Link
          to="/merchant/new"
          className="inline-block rounded-(--radius-control) bg-steel px-4 py-2.5 text-[13px] font-black text-white"
        >
          {t('welcome.openShop')}
        </Link>
      </Card>
    </main>
  )
}
