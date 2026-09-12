import { useState } from 'react'
import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { payLinkFn } from '#/auth/payment-link'
import { Button } from '#/components/chrome'
import { Mark } from '#/components/brand'
import { LocaleToggle } from '#/components/locale-toggle'
import { PaydayStrip } from '#/components/ledger'
import { Card, KeyValueRow } from '#/components/primitives'
import { useI18n } from '#/i18n/context'
import { MINTED } from '#/lib/freshness'
import type { PaymentMethod } from '#/providers/types'

const loadLink = createServerFn({ method: 'GET' })
  .validator((input: unknown): { token: string } => ({
    token: String((input as { token?: unknown }).token ?? ''),
  }))
  .handler(async ({ data }) => {
    const { getDatabase } = await import('#/db/client')
    const { readPaymentLink } = await import('#/db/queries/payment-link')

    return readPaymentLink(getDatabase(), data.token)
  })

const METHODS: Array<PaymentMethod> = ['apple_pay', 'mada', 'card']

/**
 * UC-17: the page a payment link opens. It is outside the app in every sense
 * that matters — no sign-in, no dock, nothing of anybody's ledger on it but
 * the one amount the shop is asking for. What the reader holds is the token,
 * and the token is what the server answers.
 */
export const Route = createFileRoute('/r/$token')({
  // The amount on it is acted on the moment it is read, and a link paid in
  // another tab must not be painted from what this one last saw.
  ...MINTED,
  loader: async ({ params }) => {
    const link = await loadLink({ data: { token: params.token } })
    // A token that is not one of ours is a page that is not there, which is
    // also the whole answer somebody guessing gets.
    if (!link) throw notFound()
    return link
  },
  component: WebCheckout,
})

type Stage =
  | { at: 'ready' }
  | { at: 'paying' }
  | { at: 'paid'; reference: string | null }
  | { at: 'failed' }

function WebCheckout() {
  const link = Route.useLoaderData()
  const { t, money, date } = useI18n()
  const router = useRouter()

  const [stage, setStage] = useState<Stage>({ at: 'ready' })
  const [method, setMethod] = useState<PaymentMethod | null>(null)

  const pay = async (chosen: PaymentMethod) => {
    setMethod(chosen)
    setStage({ at: 'paying' })

    const result = await payLinkFn({
      data: { token: link.token, method: chosen },
    })

    if (result.problem) {
      // Paid, run out or no longer the right amount: the page has to say so
      // rather than offer the button again, and the loader is what knows.
      if (result.problem !== 'refused') {
        setStage({ at: 'ready' })
        await router.invalidate()
        return
      }
      setStage({ at: 'failed' })
      return
    }

    setStage({ at: 'paid', reference: result.receiptReference })
  }

  const paid =
    stage.at === 'paid'
      ? { reference: stage.reference }
      : link.state === 'paid'
        ? { reference: link.receiptReference }
        : null

  return (
    <main className="mx-auto min-h-dvh max-w-sm bg-bone px-5 py-7">
      <header className="mb-5 flex items-center justify-between">
        <span className="flex items-center gap-2 text-brand">
          <Mark className="h-7" title={t('appName')} />
          <b className="text-[15px] font-black">{t('appName')}</b>
        </span>
        <LocaleToggle className="bg-neutral-bg text-ink" />
      </header>
      <p className="mb-4 text-[12.5px] font-bold text-muted">
        {t('web.tagline')}
      </p>

      {paid ? (
        <Card data-testid="web-paid">
          <h1 className="mb-1 text-lg font-black text-good-text">
            {t('web.paidTitle')}
          </h1>
          <p className="mb-3 text-[12.5px] font-bold text-muted">
            {t('web.paidBody')}
          </p>
          <KeyValueRow label={t('web.amountPaid')} emphasis>
            {money(link.amountHalalas)}
          </KeyValueRow>
          <KeyValueRow label={t('pay.reference')}>
            {paid.reference ?? '—'}
          </KeyValueRow>
        </Card>
      ) : link.state === 'expired' || link.state === 'changed' ? (
        <Card data-testid="web-closed">
          <h1 className="mb-1 text-lg font-black text-ink">
            {t(
              link.state === 'expired'
                ? 'web.expiredTitle'
                : 'web.changedTitle',
            )}
          </h1>
          <p className="text-[12.5px] font-bold text-muted">
            {t(
              link.state === 'expired' ? 'web.expiredBody' : 'web.changedBody',
            )}
          </p>
        </Card>
      ) : (
        <>
          <Card className="text-center" data-testid="web-claim">
            <p className="text-[12px] font-extrabold text-muted">
              {t('web.claim', { shop: link.shopName })}
            </p>
            <p className="my-1 text-[30px] font-black text-ink">
              {money(link.amountHalalas)}
            </p>
            {link.dueAt ? (
              <p className="text-[11.5px] font-bold text-muted">
                {t('web.due', { date: date(link.dueAt) })}
              </p>
            ) : null}
          </Card>

          <div className="my-3">
            <PaydayStrip />
          </div>

          <div className="grid gap-2">
            {METHODS.map((option) => (
              <Button
                key={option}
                tone={option === 'card' ? 'ghost' : 'pay'}
                data-testid={`web-${option}`}
                disabled={stage.at === 'paying'}
                onClick={() => void pay(option)}
              >
                {stage.at === 'paying' && option === method
                  ? t('pay.working')
                  : t(`pay.method.${option}`)}
              </Button>
            ))}
          </div>

          <p className="mt-3 text-center text-[11.5px] font-bold text-muted">
            {t('web.gateway')}
          </p>

          {stage.at === 'failed' ? (
            <p
              role="alert"
              data-testid="web-failed"
              className="mt-3 text-[12.5px] font-extrabold text-bad-text"
            >
              {t('web.failed')}
            </p>
          ) : null}

          <p className="mt-6 text-center text-[11.5px] leading-6 font-bold text-muted">
            {t('web.note')}
          </p>
        </>
      )}
    </main>
  )
}
