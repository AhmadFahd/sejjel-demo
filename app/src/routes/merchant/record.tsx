import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSideOf } from '#/auth/enter'
import { localSaudiMobile } from '#/auth/phone'
import { cancelOperation, recordOperation } from '#/auth/operation'
import { Button, buttonClass } from '#/components/chrome'
import { Card, KeyValueRow, MobileNumber, cx } from '#/components/primitives'
import { LimitBar } from '#/components/ledger'
import { InvoicePicker } from '#/components/invoice-picker'
import type { PickedInvoice } from '#/components/invoice-picker'
import { parseAmount } from '#/lib/money'
import { PENDING_MINUTES, projectBalance } from '#/lib/purchase'
import { useI18n } from '#/i18n/context'
import type { PurchaseProblem } from '#/lib/purchase'

const loadCustomers = createServerFn({ method: 'GET' })
  .validator((input: unknown): { pending: string } => ({
    pending: String((input as { pending?: unknown }).pending ?? ''),
  }))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('#/auth/session.server')
    const { getDatabase } = await import('#/db/client')
    const { listMerchantConnections, readShopTransaction } =
      await import('#/db/queries/ledger')
    const user = await requireSignedInUser()
    const shop = user.roles.merchant
    if (!shop) return null

    const db = getDatabase()

    // Everyone the shop could record against, in one list: a grocery has the
    // customer standing there, and picking them should not need a search.
    const customers = await listMerchantConnections(db, shop.id, new Date(), {
      limit: 200,
    })

    // The status of the operation being waited on, read fresh by the id the
    // screen is waiting on rather than by walking every customer's ledger
    // until it turns up. The stream invalidates this loader, which is how the
    // waiting screen moves on without a timer.
    const waitingOn = data.pending
      ? await readShopTransaction(db, {
          transactionId: data.pending,
          merchantId: shop.id,
        })
      : null

    return { customers, waitingOn }
  })

/** UC-04: عملية جديدة — what the customer just bought, on credit. */
export const Route = createFileRoute('/merchant/record')({
  beforeLoad: ({ context }) => requireSideOf(context.person, 'merchant'),
  validateSearch: (
    search: Record<string, unknown>,
  ): { customer?: string; pending?: string } => {
    const customer = String(search.customer ?? '')
    const pending = String(search.pending ?? '')
    return {
      ...(customer ? { customer } : {}),
      ...(pending ? { pending } : {}),
    }
  },
  loaderDeps: ({ search }) => ({ pending: search.pending ?? '' }),
  loader: ({ deps }) => loadCustomers({ data: { pending: deps.pending } }),
  // #75, and the same reason the log holds it back: the operation being
  // recorded lives in this component's state, and putting the app's loader in
  // front of it unmounts the screen and throws that away. Recording a
  // purchase puts its id in the URL, which is a new set of loader deps and so
  // a new match, so the screen would go while the shop was mid-operation.
  pendingMs: Infinity,
  component: RecordOperation,
})

type Problem = PurchaseProblem | 'connection'

function RecordOperation() {
  const data = Route.useLoaderData()
  const { customer } = Route.useSearch()
  const { t, money, number } = useI18n()
  const router = useRouter()

  const [connectionId, setConnectionId] = useState(customer ?? '')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [problems, setProblems] = useState<Array<Problem>>([])
  // What the refusal or the warning is about, in figures.
  const [figures, setFigures] = useState({
    overByHalalas: 0,
    availableHalalas: 0,
    overdueHalalas: 0,
    daysOverdue: 0,
  })
  const [busy, setBusy] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  // One id per operation being entered, so a second tap on a slow connection
  // finds the purchase the first one made instead of recording another.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const [invoice, setInvoice] = useState<PickedInvoice | null>(null)

  if (!data) return null

  // The operation is settled when the ledger says so, not when a timer does.
  const settled = data.waitingOn !== null && data.waitingOn.status !== 'pending'

  const chosen = data.customers.find((row) => row.connectionId === connectionId)
  const amountHalalas = parseAmount(amount) ?? 0
  const projection = chosen
    ? projectBalance({
        amountHalalas,
        balanceHalalas: chosen.balanceHalalas,
        limitHalalas: chosen.limitHalalas,
      })
    : null

  const send = async (acknowledgedOverdue = false) => {
    setBusy(true)
    const result = await recordOperation({
      data: {
        connectionId,
        amountHalalas,
        description,
        requestId,
        acknowledgedOverdue,
        invoiceId: invoice?.invoiceId ?? null,
      },
    })
    setBusy(false)
    setProblems(result.problems)
    setFigures({
      overByHalalas: result.overByHalalas ?? 0,
      availableHalalas: result.availableHalalas ?? 0,
      overdueHalalas: result.overdueHalalas ?? 0,
      daysOverdue: result.daysOverdue ?? 0,
    })

    if (result.problems.length === 0 && result.transactionId) {
      setPendingId(result.transactionId)
      // The id goes in the URL so the loader can watch the operation, and the
      // stream's invalidation is what moves this screen on.
      await router.navigate({
        to: '/merchant/record',
        search: { pending: result.transactionId },
        replace: true,
      })
    }
  }

  const callOff = async () => {
    if (!pendingId) return
    setBusy(true)
    await cancelOperation({ data: { transactionId: pendingId } })
    setBusy(false)
    await startOver()
  }

  const startOver = async () => {
    setPendingId(null)
    setAmount('')
    setDescription('')
    setInvoice(null)
    setRequestId(crypto.randomUUID())
    await router.navigate({ to: '/merchant/record', search: {}, replace: true })
  }

  const field =
    'mb-1 w-full rounded-(--radius-control) border border-neutral-bg px-3 py-3 text-base'
  const label = 'mb-1 block text-[12.5px] font-bold text-muted'

  return (
    <>
      <main className="p-3.5">
        <Link
          to="/merchant"
          className="mb-3 inline-block text-[13px] font-black text-brand"
        >
          {t('nav.back')}
        </Link>
        <h1 className="mb-3 text-xl font-black text-ink">
          {t('operation.new')}
        </h1>

        {settled ? (
          <Card data-testid="operation-settled">
            <h2 className="mb-1 text-base font-black text-good-text">
              {t(
                data.waitingOn?.status === 'applied'
                  ? 'operation.applied'
                  : 'operation.declined',
              )}
            </h2>
            <Button tone="primary" className="mt-3" onClick={startOver}>
              {t('operation.new')}
            </Button>
          </Card>
        ) : pendingId ? (
          <Card data-testid="waiting">
            <h2 className="mb-1 text-base font-black text-ink">
              {t('operation.waiting')}
            </h2>
            <p className="mb-3 text-[13px] font-bold text-muted">
              {t('operation.waitingBody', { minutes: PENDING_MINUTES })}
            </p>
            <Link
              to="/merchant/scan"
              className={buttonClass('primary', 'mb-2.5')}
              data-testid="go-scan"
            >
              {t('scan.title')}
            </Link>
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

            <InvoicePicker picked={invoice} onPicked={setInvoice} />

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
                onClick={() => send()}
              >
                {t('operation.submit')}
              </Button>
            </div>

            {problems.length > 0 ? (
              <div role="alert" className="mt-4" data-testid="refusal">
                <ul className="space-y-1">
                  {problems.map((problem) => (
                    <li
                      key={problem}
                      className={cx(
                        'text-[12.5px] font-bold',
                        problem === 'overdue'
                          ? 'text-warn-text'
                          : 'text-bad-text',
                      )}
                    >
                      {problem === 'limit'
                        ? t('operation.error.limitBy', {
                            over: money(figures.overByHalalas),
                            available: money(figures.availableHalalas),
                          })
                        : problem === 'overdue'
                          ? t('operation.error.overdue', {
                              days: number(figures.daysOverdue),
                              amount: money(figures.overdueHalalas),
                            })
                          : t(`operation.error.${problem}`)}
                    </li>
                  ))}
                </ul>

                {/* UC-06: being late warns rather than stops, and going on
                    anyway is recorded against the operation. */}
                {problems.includes('overdue') ? (
                  <div className="mt-3">
                    <Button
                      tone="primary"
                      disabled={busy}
                      data-testid="record-anyway"
                      onClick={() => send(true)}
                    >
                      {t('operation.continue')}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        )}
      </main>
    </>
  )
}
