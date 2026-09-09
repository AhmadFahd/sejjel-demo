import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { describeEnvironment } from '#/lib/environment'
import { loadSignedInUser, signOut } from '#/auth/session'
import { Button } from '#/components/chrome'
import { useI18n } from '#/i18n/context'

/**
 * Placeholder until the ledger exists. It reports what the server thinks it is,
 * which is the one thing worth seeing before there is anything else to see.
 */
const getEnvironment = createServerFn({ method: 'GET' }).handler(() =>
  describeEnvironment({
    isProduction: import.meta.env.PROD,
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version,
    now: new Date(),
  }),
)

export const Route = createFileRoute('/')({
  component: Home,
  loader: async () => ({
    environment: await getEnvironment(),
    user: await loadSignedInUser(),
  }),
})

function Home() {
  const { environment: env, user } = Route.useLoaderData()
  const { t } = useI18n()
  const router = useRouter()

  const rows = [
    [t('shell.mode'), env.mode],
    [t('shell.nodeEnv'), env.nodeEnv],
    [t('shell.node'), env.node],
    [t('shell.startedAt'), env.startedAt],
  ] as const

  return (
    <main className="mx-auto max-w-xl px-8 pb-8">
      <h1 className="text-3xl font-bold">{t('appName')}</h1>
      <p className="mt-2 text-muted">{t('shell.nothingYet')}</p>

      <div className="mt-6" data-testid="session">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold text-ink">
              {t('auth.signedInAs', { name: user.name })}
            </span>
            <Button
              tone="soft"
              className="w-auto px-4 py-2 text-[13px]"
              onClick={async () => {
                await signOut()
                await router.invalidate()
              }}
            >
              {t('auth.signOut')}
            </Button>
          </div>
        ) : (
          <Link
            to="/sign-in"
            className="inline-block rounded-(--radius-control) bg-steel px-4 py-2 text-[13px] font-black text-white"
          >
            {t('auth.title')}
          </Link>
        )}
      </div>

      <dl
        className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm"
        data-testid="environment"
      >
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
