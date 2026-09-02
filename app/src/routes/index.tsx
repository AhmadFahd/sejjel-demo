import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

/**
 * Placeholder until the ledger exists. It reports what the server thinks it is,
 * which is the one thing worth seeing before there is anything else to see.
 */
const getEnvironment = createServerFn({ method: 'GET' }).handler(() => ({
  mode: import.meta.env.PROD ? 'production' : 'development',
  nodeEnv: process.env.NODE_ENV ?? 'unset',
  node: process.version,
  startedAt: new Date().toISOString(),
}))

export const Route = createFileRoute('/')({
  component: Home,
  loader: () => getEnvironment(),
})

function Home() {
  const env = Route.useLoaderData()

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold">سجّل</h1>
      <p className="mt-2 text-slate-600">
        The app shell. Nothing of the ledger is built yet.
      </p>

      <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-slate-500">Mode</dt>
        <dd className="font-medium">{env.mode}</dd>
        <dt className="text-slate-500">NODE_ENV</dt>
        <dd className="font-medium">{env.nodeEnv}</dd>
        <dt className="text-slate-500">Node</dt>
        <dd className="font-medium">{env.node}</dd>
        <dt className="text-slate-500">Server started</dt>
        <dd className="font-medium">{env.startedAt}</dd>
      </dl>
    </main>
  )
}
