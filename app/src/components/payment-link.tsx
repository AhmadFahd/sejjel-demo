import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button, Sheet, buttonClass } from './chrome'
import { Card, KeyValueRow, MobileNumber } from './primitives'
import { sharePaymentLinkFn } from '#/auth/payment-link'
import { paymentLinkUrl, whatsappUrl } from '#/lib/payment-link'
import { paydayOnOrAfter } from '#/lib/payday'
import { useI18n } from '#/i18n/context'

type Issued = { token: string; amountHalalas: number; expiresAt: Date }

/**
 * UC-17: the merchant's own WhatsApp, with the message already written. The
 * shop shares the link; nothing is sent from the app, which is what keeps
 * this out of the Business API and its template approval.
 *
 * The sheet is the prototype's: the message as WhatsApp will show it, then a
 * way out to WhatsApp and a way to look at the page the customer will see.
 */
export function PaymentLinkShare({
  connectionId,
  shopName,
  customerName,
  customerMobile,
  dueAt,
  now,
}: {
  connectionId: string
  shopName: string
  customerName: string
  /** E.164, which is the form WhatsApp wants. */
  customerMobile: string
  dueAt: Date | null
  now: Date
}) {
  const { t, money, date } = useI18n()
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState<Issued | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const share = async () => {
    setBusy(true)
    const result = await sharePaymentLinkFn({ data: { connectionId } })
    setBusy(false)

    if (!result.token || !result.expiresAt) {
      setProblem(result.problem)
      return
    }

    setProblem(null)
    setIssued({
      token: result.token,
      amountHalalas: result.amountHalalas,
      expiresAt: new Date(result.expiresAt),
    })
  }

  const message = issued
    ? t('link.message', {
        name: customerName,
        shop: shopName,
        amount: money(issued.amountHalalas),
        payday: date(dueAt ?? paydayOnOrAfter(now)),
        url: paymentLinkUrl(issued.token),
      })
    : ''

  return (
    <>
      <Button
        tone="ghost"
        className="mb-3"
        disabled={busy}
        onClick={share}
        data-testid="share-link"
      >
        {t('link.share')}
      </Button>

      {problem ? (
        <p
          role="alert"
          className="mb-3 text-[12.5px] font-extrabold text-bad-text"
        >
          {t(
            problem === 'nothing'
              ? 'link.error.nothing'
              : 'link.error.connection',
          )}
        </p>
      ) : null}

      <Sheet
        open={issued !== null}
        title={t('link.title')}
        onClose={() => setIssued(null)}
      >
        {issued ? (
          <>
            <Card data-testid="link-sheet">
              <KeyValueRow label={t('link.to')}>
                <MobileNumber>{customerMobile}</MobileNumber>
              </KeyValueRow>
              {/* The message as it will arrive, line breaks and all. */}
              <p className="mt-2 text-[12.5px] leading-7 font-bold whitespace-pre-line text-ink">
                {message}
              </p>
              <p className="mt-3 text-[11.5px] font-bold text-muted">
                {t('link.expires', { date: date(issued.expiresAt) })}
              </p>
            </Card>

            <a
              href={whatsappUrl(customerMobile, message)}
              target="_blank"
              rel="noreferrer"
              className={buttonClass('primary', 'mt-3 mb-2')}
              data-testid="open-whatsapp"
            >
              {t('link.open')}
            </a>

            <Link
              to="/r/$token"
              params={{ token: issued.token }}
              className={buttonClass('ghost')}
              data-testid="preview-link"
            >
              {t('link.preview')}
            </Link>
          </>
        ) : null}
      </Sheet>
    </>
  )
}
