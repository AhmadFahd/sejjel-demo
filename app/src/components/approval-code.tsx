import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from './chrome'
import { APPROVAL_SECONDS } from '#/lib/approval'
import { useI18n } from '#/i18n/context'

/**
 * UC-07: the code the merchant scans, with the countdown that says how long
 * it is good for. It is a real QR of a signed payload, not a picture of one:
 * the prototype drew noise, and a camera has to be able to read this.
 */
export function ApprovalCode({
  code,
  issuedAt,
  onRegenerate,
}: {
  code: string
  /** When this code was minted, which is what the countdown counts from. */
  issuedAt: number
  onRegenerate: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { t, number } = useI18n()
  const [left, setLeft] = useState(APPROVAL_SECONDS)

  useEffect(() => {
    if (canvas.current) {
      void QRCode.toCanvas(canvas.current, code, {
        width: 232,
        margin: 1,
        color: { dark: '#37453F', light: '#ffffff' },
      })
    }
  }, [code])

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
        <canvas
          ref={canvas}
          data-testid="approval-qr"
          className="rounded-(--radius-control)"
        />
      </div>

      <p
        className="mb-3 text-center text-[13px] font-black text-ink"
        data-testid="countdown"
        aria-live="polite"
      >
        {left > 0
          ? t('approval.expiresIn', { time: `${number(minutes)}:${seconds}` })
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

      <Button tone="ghost" onClick={onRegenerate}>
        {t('approval.regenerate')}
      </Button>
    </div>
  )
}
