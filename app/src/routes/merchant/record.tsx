import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSide } from '#/auth/guard'
import { localSaudiMobile } from '#/auth/phone'
import { cancelOperation, recordOperation } from '#/auth/operation'
import { AppBar, Button } from '#/components/chrome'
import { Card, KeyValueRow, MobileNumber } from '#/components/primitives'
import { LimitBar } from '#/components/ledger'
import { parseAmount } from '#/lib/money'
import { PENDING_MINUTES, projectBalance } from '#/lib/purchase'
import { useI18n } from '#/i18n/context'
import type { PurchaseProblem } from '#/lib/purchase'

const loadCustomers = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSignedInUser } = await import('#/auth/session.server')
  const { getDatabase } = await import('#/db/client')
  const { listMerchantConnections } = await import('#/db/queries/ledger')
  const user = await requireSignedInUser()
  const shop = user.roles.merchant
  if (!shop) return null

  // Everyone the shop could record against, in one list: a grocery has the
  // customer standing there, and picking them should not need a search.
  return {
    customers: await listMerchantConnections(
      getDatabase(),
      shop.id,
      new Date(),
      {
        limit: 200,
      },
    ),
  }
})

/** UC-04: عملية جديدة — what the customer just bought, on credit. */
export const Route = createFileRoute('/merchant/record')({
  beforeLoad: () => requireSide('merchant'),
  validateSearch: (search: Record<string, unknown>): { customer?: string } => {
    const customer = String(search.customer ?? '')
    return customer ? { customer } : {}
  },
  loader: () => loadCustomers(),
  component: RecordOperation,
})

type Problem = PurchaseProblem | 'connection'

function RecordOperation() {
  const data = Route.useLoaderData()
  const { customer } = Route.useSearch()
  const { t, money } = useI18n()
  const router = useRouter()

  const [connectionId, setConnectionId] = useState(customer ?? '')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [problems, setProblems] = useState<Array<Problem>>([])
  const [busy, setBusy] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  // One id per operation being entered, so a second tap on a slow connection
  // finds the purchase the first one made instead of recording another.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())

  if (!data) return null

  const chosen = data.customers.find((row) => row.connectionId === connectionId)
  const amountHalalas = parseAmount(amount) ?? 0
  const projection = chosen
    ? projectBalance({
        amountHalalas,
        balanceHalalas: chosen.balanceHalalas,
        limitHalalas: chosen.limitHalalas,
      })
    : null

  const send = async () => {
    setBusy(true)
    const result = await recordOperation({
      data: { connectionId, amountHalalas, description, requestId },
    })
    setBusy(false)
    setProblems(result.problems)

    if (result.problems.length === 0 && result.transactionId) {
      setPendingId(result.transactionId)
      await router.invalidate()
    }
  }

  const callOff = async () => {
    if (!pendingId) return
    setBusy(true)
    await cancelOperation({ data: { transactionId: pendingId } })
    setBusy(false)
    setPendingId(null)
    setAmount('')
    setDescription('')
    setRequestId(crypto.randomUUID())
    await router.invalidate()
  }

  const field =
    'mb-1 w-full rounded-(--radius-control) border border-neutral-bg px-3 py-3 text-base'
  const label = 'mb-1 block text-[12.5px] font-extrabold text-muted'

  return (
    <>
      <AppBar />
      <main className="p-3.5">
        <Link
          to="/merchant"
          className="mb-3 inline-block text-[13px] font-black text-steel"
        >
          {t('nav.back')}
        </Link>
        <h1 className="mb-3 text-xl font-black text-ink">
          {t('operation.new')}
        </h1>

        {pendingId ? (
          <Card data-testid="waiting">
            <h2 className="mb-1 text-base font-black text-ink">
              {t('operation.waiting')}
            </h2>
            <p className="mb-3 text-[13px] font-bold text-muted">
              {t('operation.waitingBody', { minutes: PENDING_MINUTES })}
            </p>
            <Button tone="ghost" disabled={busy} onClick={callOff}>
              {t('operation.cancel')}
            </Button>
          </Card>
        ) : data.customers.length === 0 ? (
          <Card>
            <h2 className="mb-1 text-base font-black text-ink">
              {t('merchant.noCustomers')}
            </h2>
            <p className="text-[13px] font-bold text-muted">
              {t('merchant.noCustomersBody')}
            </p>
          </Card>
        ) : (
          <Card>
            <label className={label} htmlFor="operation-customer">
              {t('operation.customer')}
            </label>
            <select
              id="operation-customer"
              className={field}
              value={connectionId}
              onChange={(event) => setConnectionId(event.target.value)}
            >
              <option value="">{t('operation.pickCustomer')}</option>
              {data.customers.map((row) => (
                <option key={row.connectionId} value={row.connectionId}>
                  {row.customerName}
                </option>
              ))}
            </select>

            {chosen ? (
              <p className="mt-1 mb-2">
                <MobileNumber>
                  {localSaudiMobile(chosen.customerMobile)}
                </MobileNumber>
              </p>
            ) : null}

            <label className={`${label} mt-3`} htmlFor="operation-amount">
              {t('operation.amount')}
            </label>
            <input
              id="operation-amount"
              inputMode="decimal"
              dir="ltr"
              className={field}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />

            <label className={`${label} mt-3`} htmlFor="operation-description">
              {t('operation.description')}
            </label>
            <input
              id="operation-description"
              className={field}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            {chosen && projection ? (
              <div className="mt-4" data-testid="projection">
                <KeyValueRow label={t('operation.projected')} emphasis>
                  {money(projection.balanceHalalas)}
                </KeyValueRow>
                <KeyValueRow label={t('ledger.available')}>
                  {money(projection.availableHalalas)}
                </KeyValueRow>
                <LimitBar
                  usedHalalas={projection.balanceHalalas}
                  limitHalalas={projection.limitHalalas}
                />
              </div>
            ) : null}

            <div className="mt-4">
              <Button
                tone="primary"
                disabled={busy || !connectionId || amountHalalas <= 0}
                onClick={send}
              >
                {t('operation.submit')}
              </Button>
            </div>

            {problems.length > 0 ? (
              <ul role="alert" className="mt-4 space-y-1">
                {problems.map((problem) => (
                  <li
                    key={problem}
                    className="text-[12.5px] font-extrabold text-bad-text"
                  >
                    {t(`operation.error.${problem}`)}
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        )}
      </main>
    </>
  )
}
