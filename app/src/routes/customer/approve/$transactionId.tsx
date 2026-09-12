import { useState } from 'react'
import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import {
  acceptShopTerms,
  approveOperationFn,
  declineOperationFn,
} from '#/auth/approval'
import { Button } from '#/components/chrome'
import { Card, KeyValueRow } from '#/components/primitives'
import { ApprovalCode } from '#/components/approval-code'
import { useI18n } from '#/i18n/context'
import { requireSide } from '#/auth/enter'
import { MINTED } from '#/lib/freshness'

const loadOperation = createServerFn({ method: 'GET' })
  .validator((input: unknown): { transactionId: string } => ({
    transactionId: String(
      (input as { transactionId?: unknown }).transactionId ?? '',
    ),
  }))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('#/auth/session.server')
    const { getDatabase } = await import('#/db/client')
    const { readOperation } = await import('#/db/queries/approval')
    const user = await requireSignedInUser()

    const operation = await readOperation(getDatabase(), data.transactionId)
    // Somebody else's operation is not there, rather than there and refused.
    if (!operation || operation.customerUserId !== user.id) return null
    return operation
  })

/** UC-07: nothing lands on a ledger without the person standing there agreeing. */
export const Route = createFileRoute('/customer/approve/$transactionId')({
  ...MINTED,
  loader: async ({ params, parentMatchPromise }) => {
    await requireSide(parentMatchPromise, 'customer')
    const operation = await loadOperation({
      data: { transactionId: params.transactionId },
    })
    if (!operation) throw notFound()
    return operation
  },
  component: ApproveOperation,
})

function ApproveOperation() {
  const operation = Route.useLoaderData()
  const { t, money, date } = useI18n()
  const router = useRouter()

  const [code, setCode] = useState<string | null>(null)
  const [issuedAt, setIssuedAt] = useState<number>(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const approve = async () => {
    setBusy(true)
    const result = await approveOperationFn({
      data: { transactionId: operation.transactionId },
    })
    setBusy(false)
    setProblem(result.problem)
    if (result.code) {
      setCode(result.code)
      setIssuedAt(Date.now())
    }
  }

  const decline = async () => {
    setBusy(true)
    await declineOperationFn({
      data: { transactionId: operation.transactionId },
    })
    setBusy(false)
    await router.navigate({ to: '/customer' })
  }

  const acceptTerms = async () => {
    setBusy(true)
    await acceptShopTerms({ data: { connectionId: operation.connectionId } })
    setBusy(false)
    await router.invalidate()
  }

  return (
    <>
      <main className="p-3.5">
        <Link
          to="/customer"
          className="mb-3 inline-block text-[13px] font-black text-brand"
        >
          {t('nav.back')}
        </Link>
        <h1 className="mb-3 text-xl font-black text-ink">
          {t('approval.title')}
        </h1>

        <Card data-testid="operation">
          <div className="mb-2 text-[15px] font-black text-ink">
            {operation.merchantName}
          </div>
          <KeyValueRow label={t('operation.amount')} emphasis>
            {money(operation.amountHalalas)}
          </KeyValueRow>
          {operation.description ? (
            <KeyValueRow label={t('operation.description')}>
              {operation.description}
            </KeyValueRow>
          ) : null}
          <KeyValueRow label={t('ledger.dueDate')}>
            {operation.dueAt ? date(operation.dueAt) : t('ledger.noDueDate')}
          </KeyValueRow>

          {/* UC-11: what is being agreed to, before agreeing to it. */}
          {operation.invoiceId ? (
            <Link
              to="/invoice/$invoiceId"
              params={{ invoiceId: operation.invoiceId }}
              className="mt-3 inline-block text-[12.5px] font-black text-steel underline"
              data-testid="invoice-link"
            >
              {t('invoice.open')}
            </Link>
          ) : null}
        </Card>

        {operation.status !== 'pending' ? (
          <Card data-testid="operation-settled">
            <h2 className="mb-1 text-base font-black text-ink">
              {t(
                operation.status === 'applied'
                  ? 'approval.applied'
                  : 'approval.cancelled',
              )}
            </h2>
            <Link to="/customer" className="text-[13px] font-black text-brand">
              {t('notFound.home')}
            </Link>
          </Card>
        ) : code ? (
          <Card data-testid="approval-code">
            <h2 className="mb-1 text-base font-black text-ink">
              {t('approval.showThis')}
            </h2>
            <p className="mb-3 text-[13px] font-bold text-muted">
              {t('approval.showThisBody')}
            </p>
            <ApprovalCode
              code={code}
              issuedAt={issuedAt}
              onRegenerate={approve}
            />
          </Card>
        ) : operation.termsAccepted ? (
          <div className="grid gap-2.5">
            <Button tone="primary" disabled={busy} onClick={approve}>
              {t('approval.approve')}
            </Button>
            <Button tone="ghost" disabled={busy} onClick={decline}>
              {t('approval.decline')}
            </Button>
          </div>
        ) : (
          <Card data-testid="terms">
            <h2 className="mb-1 text-base font-black text-ink">
              {t('approval.termsTitle')}
            </h2>
            <p className="mb-3 text-[13px] font-bold text-muted">
              {t('approval.termsBody', { shop: operation.merchantName })}
            </p>
            <Button tone="primary" disabled={busy} onClick={acceptTerms}>
              {t('approval.acceptTerms')}
            </Button>
          </Card>
        )}

        {problem ? (
          <p
            role="alert"
            className="mt-3 text-[12.5px] font-bold text-bad-text"
          >
            {t('approval.refused')}
          </p>
        ) : null}
      </main>
    </>
  )
}
