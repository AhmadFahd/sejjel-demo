import { useEffect, useRef } from 'react'
import { cx } from './primitives'
import { OTP_LENGTH } from '#/auth/otp'
import { useI18n } from '#/i18n/context'

/**
 * One box per digit, so the length of the code is visible before it is typed.
 * Typing moves forward, backspace moves back, and a code pasted into any box
 * fills the lot: the SMS lands on the device the code is typed on, so pasting
 * is the ordinary case rather than the exotic one.
 *
 * `onComplete` is handed the finished code rather than leaving the caller to
 * read it from state, which on the keystroke that completes it is still one
 * digit behind.
 */
export function CodeBoxes({
  code,
  onCode,
  onComplete,
  disabled = false,
  takeFocus = false,
}: {
  code: string
  onCode: (code: string) => void
  onComplete?: (code: string) => void
  disabled?: boolean
  /** For the screen that has nothing else to type into. */
  takeFocus?: boolean
}) {
  const { t } = useI18n()
  const boxes = useRef<Array<HTMLInputElement | null>>([])

  // On opening, and again whenever the caller empties the boxes: a refused
  // code is cleared, and the next one starts where the first one did.
  useEffect(() => {
    if (takeFocus && code === '') boxes.current[0]?.focus()
  }, [code, takeFocus])

  const commit = (next: string, focusIndex: number) => {
    onCode(next)
    boxes.current[Math.min(focusIndex, OTP_LENGTH - 1)]?.focus()
    // Only the digit that finishes the code submits it. Changing a digit of a
    // code that is already complete is an edit, not another guess, and the
    // server counts guesses.
    if (code.length < OTP_LENGTH && next.length === OTP_LENGTH) {
      onComplete?.(next)
    }
  }

  /** A whole code, however it arrived: pasted, autofilled, or dictated. */
  const fill = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (digits) commit(digits, digits.length)
  }

  return (
    <div dir="ltr" data-testid="code-boxes" className="flex gap-2">
      {Array.from({ length: OTP_LENGTH }, (_unused, index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element
          }}
          aria-label={t('auth.codeDigit', { position: index + 1 })}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={code[index] ?? ''}
          className={cx(
            'tabular h-14 w-full rounded-(--radius-control) border-2 text-center text-[22px] font-black text-ink',
            code[index] ? 'border-steel bg-card' : 'border-neutral-bg bg-mist',
          )}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, '')
            if (typed.length > 1) {
              fill(typed)
              return
            }
            const next = code.padEnd(index, ' ').split('')
            next[index] = typed
            commit(
              next.join('').replace(/\D/g, '').slice(0, OTP_LENGTH),
              typed ? index + 1 : index,
            )
          }}
          onPaste={(event) => {
            event.preventDefault()
            fill(event.clipboardData.getData('text'))
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Backspace' || code[index]) return
            // An empty box sends the deletion to the digit before it, which is
            // where the person is actually looking.
            event.preventDefault()
            commit(
              code.slice(0, Math.max(0, index - 1)),
              Math.max(0, index - 1),
            )
          }}
        />
      ))}
    </div>
  )
}
