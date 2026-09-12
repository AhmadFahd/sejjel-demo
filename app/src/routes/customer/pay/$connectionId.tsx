import { useState } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSide } from '#/auth/guard'
import { confirmPayment, startPayment } from '#/auth/settle'
import { Button } from '#/components/chrome'
import { Card, KeyValueRow } from '#/components/primitives'
import { parseAmount } from '#/lib/money'
import { useI18n } from '#/i18n/context'
import type { PaymentMethod } from '#/providers/types'
import type { SettlementProblem } from '#/lib/settlement'

const loadAccount = createServerFn({ method: 'GET' })
  .validator((input: unknown): { connectionId: string } => ({
    connectionId: String(
      (input as { connectionId?: unknown }).connectionId ?? '',
    ),
  }))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('#/auth/session.server')
    const { getDatabase } = await import('#/db/client')
    const { getConnectionSummary } = await import('#/db/queries/ledger')
    const user = await requireSignedInUser()

    const summary = await getConnectionSummary(getDatabase(), data.connectionId)
    if (!summary || summary.customerUserId !== user.id) return null
    return summary
  })

const METHODS: Array<PaymentMethod> = ['apple_pay', 'mada', 'card']

/** UC-10: paying a shop back, in full or in part. */
export const Route = createFileRoute('/customer/pay/$connectionId')({
  beforeLoad: () => requireSide('customer'),
  loader: async ({ params }) => {
    const summary = await loadAccount({
      data: { connectionId: params.connectionId },
    })
    if (!summary) throw notFound()
    return summary
  },
  component: PayShop,
})

type Stage =
  | { at: 'choosing' }
  | { at: 'paying' }
  | { at: 'paid'; reference: string | null }
  | { at: 'failed'; reason: string | null }

function PayShop() {
  const summary = Route.useLoaderData()
  const { t, money } = useI18n()

  const [whole, setWhole] = useState(true)
  const [typed, setTyped] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('mada')
  const [stage, setStage] = useState<Stage>({ at: 'choosing' })
  const [problems, setProblems] = useState<
    Array<SettlementProblem | 'connection'>
  >([])
  // One id for this attempt, so a second press settles once.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())

  const amountHalalas = whole
    ? summary.balanceHalalas
    : (parseAmount(typed) ?? 0)

  const pay = async () => {
    setStage({ at: 'paying' })
    const started = await startPayment({
      data: {
        connectionId: summary.connectionId,
        amountHalalas,
        method,
        requestId,
      },
    })

    if (started.problems.length > 0 || !started.transactionId) {
      setProblems(started.problems)
      setStage({ at: 'choosing' })
      return
    }

    setProblems([])
    const { state } = await confirmPayment({
      data: { transactionId: started.transactionId },
    })

    if (state?.status === 'applied') {
      setStage({ at: 'paid', reference: state.receiptReference })
      return
    }
    // A payment the gateway refused leaves the balance where it was.
    setRequestId(crypto.randomUUID())
    setStage({ at: 'failed', reason: state?.failureReason ?? null })
  }

  const field =
    'mb-1 w-full rounded-(--radius-control) border border-neutral-bg px-3 py-3 text-base'

  return (
    <>
      <main className="p-3.5">
        <Link
          to="/customer/$connectionId"
          params={{ connectionId: summary.connectionId }}
          className="mb-3 inline-block text-[13px] font-black text-steel"
        >
          {t('nav.back')}
        </Link>
        <h1 className="mb-3 text-xl font-black text-ink">
          {t('pay.title', { shop: summary.merchantName })}
        </h1>

        {stage.at === 'paid' ? (
          <Card data-testid="receipt">
            <h2 className="mb-1 text-base font-black text-good-text">
              {t('pay.paid')}
            </h2>
            <KeyValueRow label={t('operation.amount')} emphasis>
              {money(amountHalalas)}
            </KeyValueRow>
            <KeyValueRow label={t('pay.reference')}>
              {stage.reference ?? '—'}
            </KeyValueRow>
            <Link
              to="/customer/$connectionId"
              params={{ connectionId: summary.connectionId }}
              className="mt-3 inline-block text-[13px] font-black text-steel"
            >
              {t('notFound.home')}
            </Link>
          </Card>
        ) : (
          <Card>
            <KeyValueRow label={t('ledger.balance')} emphasis>
              {money(summary.balanceHalalas)}
            </KeyValueRow>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                tone={whole ? 'primary' : 'soft'}
                onClick={() => setWhole(true)}
              >
                {t('pay.whole')}
              </Button>
              <Button
                tone={whole ? 'soft' : 'primary'}
                onClick={() => setWhole(false)}
              >
                {t('pay.part')}
              </Button>
            </div>

            {whole ? null : (
              <div className="mt-3">
                <label
                  className="mb-1 block text-[12.5px] font-extrabold text-muted"
                  htmlFor="pay-amount"
                >
                  {t('operation.amount')}
                </label>
                <input
                  id="pay-amount"
                  inputMode="decimal"
                  dir="ltr"
                  className={field}
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                />
              </div>
            )}

            <div className="mt-4 grid gap-2">
              {METHODS.map((option) => (
                <Button
                  key={option}
                  tone={option === method ? 'ink' : 'soft'}
                  data-testid={`method-${option}`}
                  onClick={() => setMethod(option)}
                >
                  {t(`pay.method.${option}`)}
                </Button>
              ))}
            </div>

            <div className="mt-4">
              <Button
                tone="pay"
                disabled={stage.at === 'paying' || amountHalalas <= 0}
                onClick={pay}
              >
                {stage.at === 'paying'
                  ? t('pay.working')
                  : t('pay.now', { amount: money(amountHalalas) })}
              </Button>
            </div>

            {stage.at === 'failed' ? (
              <p
                role="alert"
                data-testid="pay-failed"
                className="mt-3 text-[12.5px] font-extrabold text-bad-text"
              >
                {t('pay.failed')} {stage.reason ? `(${stage.reason})` : ''}
              </p>
            ) : null}

            {problems.map((problem) => (
              <p
                key={problem}
                role="alert"
                className="mt-3 text-[12.5px] font-extrabold text-bad-text"
              >
                {t(`pay.error.${problem}`)}
              </p>
            ))}
          </Card>
        )}
      </main>
    </>
  )
}
