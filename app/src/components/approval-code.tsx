import { useEffect, useState } from 'react'
import { Button } from './chrome'
import { LoadingDots } from './loading'
import { QR_SIZE, QrCanvas } from './qr-canvas'
import { APPROVAL_SECONDS } from '#/lib/approval'
import { useI18n } from '#/i18n/context'

/**
 * UC-07: the code the merchant scans, with the countdown that says how long
 * it is good for. It is a real QR of a signed payload, not a picture of one:
 * the prototype drew noise, and a camera has to be able to read this.
 *
 * #81: a code can be on its way. The square keeps its space either way, so
 * the card does not jump when the code lands, and there is nothing to scan
 * and no countdown to read until it has.
 */
export function ApprovalCode({
  code,
  issuedAt,
  waiting = false,
  onRegenerate,
}: {
  code: string | null
  /** When this code was minted, which is what the countdown counts from. */
  issuedAt: number
  /** The code is on its way. Null with nothing coming is a code that failed. */
  waiting?: boolean
  onRegenerate: () => void | Promise<void>
}) {
  const { t, number } = useI18n()
  const [left, setLeft] = useState(APPROVAL_SECONDS)
  const [minting, setMinting] = useState(false)

  useEffect(() => {
    const tick = () => {
      const gone = Math.floor((Date.now() - issuedAt) / 1000)
      setLeft(Math.max(0, APPROVAL_SECONDS - gone))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [issuedAt])

  const minutes = Math.floor(left / 60)
  const seconds = String(left % 60).padStart(2, '0')

  return (
    <div>
      <div className="mb-3 flex justify-center">
        {code === null ? (
          <div
            className="flex items-center justify-center rounded-(--radius-control) bg-neutral-bg"
            style={{ width: QR_SIZE, height: QR_SIZE }}
            data-testid="approval-waiting"
          >
            {waiting ? (
              <LoadingDots />
            ) : (
              <p className="p-4 text-center text-[13px] font-bold text-muted">
                {t('approval.codeProblem')}
              </p>
            )}
          </div>
        ) : (
          <QrCanvas value={code} testId="approval-qr" />
        )}
      </div>

      {code === null ? null : (
        <>
          <p
            className="mb-3 text-center text-[13px] font-black text-ink"
            data-testid="countdown"
            aria-live="polite"
          >
            {left > 0
              ? t('approval.expiresIn', {
                  time: `${number(minutes)}:${seconds}`,
                })
              : t('approval.expired')}
          </p>

          {/* The code itself, for a shop whose camera will not open. */}
          <p
            className="mb-3 rounded-(--radius-control) bg-neutral-bg p-2 text-center text-[10px] break-all"
            data-testid="approval-text"
            dir="ltr"
          >
            {code}
          </p>
        </>
      )}

      {/* A new code is a round trip, so the button says so rather than
          looking unpressed until the answer lands: #75. */}
      <Button
        tone="ghost"
        disabled={minting || waiting}
        onClick={async () => {
          setMinting(true)
          try {
            await onRegenerate()
          } finally {
            setMinting(false)
          }
        }}
      >
        {minting ? <LoadingDots /> : t('approval.regenerate')}
      </Button>
    </div>
  )
}
