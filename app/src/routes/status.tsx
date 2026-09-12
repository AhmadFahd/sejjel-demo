import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { describeEnvironment } from '#/lib/environment'
import { useI18n } from '#/i18n/context'
import { SETTLED } from '#/lib/freshness'

/**
 * What the front door used to show. Useful on a deployment, and no longer in
 * the way of somebody trying to reach their ledger.
 */
const getEnvironment = createServerFn({ method: 'GET' }).handler(() =>
  describeEnvironment({
    isProduction: import.meta.env.PROD,
    nodeEnv: process.env.NODE_ENV,
    nodeVersion: process.version,
    now: new Date(),
  }),
)

export const Route = createFileRoute('/status')({
  ...SETTLED,
  loader: () => getEnvironment(),
  component: Status,
})

function Status() {
  const env = Route.useLoaderData()
  const { t } = useI18n()

  const rows = [
    [t('shell.mode'), env.mode],
    [t('shell.nodeEnv'), env.nodeEnv],
    [t('shell.node'), env.node],
    [t('shell.startedAt'), env.startedAt],
  ] as const

  return (
    <main className="mx-auto max-w-xl px-8 py-8">
      <h1 className="text-3xl font-bold">{t('appName')}</h1>
      <dl
        className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm"
        data-testid="environment"
      >
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  )
}
