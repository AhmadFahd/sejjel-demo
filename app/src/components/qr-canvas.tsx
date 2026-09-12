import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { cx } from './primitives'

/**
 * A real QR, drawn on a canvas rather than pictured: a camera has to be able
 * to read it. The prototype drew noise.
 */
export function QrCanvas({
  value,
  size = 232,
  className,
  testId,
}: {
  value: string
  size?: number
  className?: string
  testId?: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvas.current) return
    void QRCode.toCanvas(canvas.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#37453F', light: '#ffffff' },
    })
  }, [value, size])

  return (
    <canvas
      ref={canvas}
      data-testid={testId}
      className={cx('rounded-(--radius-control)', className)}
    />
  )
}
