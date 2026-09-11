import { useEffect, useRef } from 'react'
import { localSaudiMobile } from '#/auth/phone'
import { Button } from '#/components/chrome'
import { Card, cx } from '#/components/primitives'
import { useI18n } from '#/i18n/context'
import { CODE_LENGTH, useAutoSubmit } from './shared'
import { prototypeCopy } from './strings'
import type { SignInControls } from './shared'

/**
 * One screen, nothing hidden. Asking for the code does not replace the
 * number: the code section opens underneath it, the number stays on screen
 * with its own way back, and six boxes make the length of the code visible
 * before it is typed. The last box submits, so signing in is six taps.
 */
export function VariantOneScreen({ controls }: { controls: SignInControls }) {
  const { t, locale } = useI18n()
  const copy = prototypeCopy(locale)
  const { step, error, busy } = controls
  const asked = step.name === 'code'

  useAutoSubmit(controls.code, busy, controls.onVerify)

  return (
    <main className="mx-auto max-w-sm px-6 py-8">
      <h1 className="text-[26px] leading-tight font-black text-ink">
        {t('auth.title')}
      </h1>
      <p className="mt-1 mb-5 text-[12.5px] font-bold text-muted">
        {copy('trust')}
      </p>

      <Card className={cx(asked && 'opacity-90')}>
        <div className="mb-1 flex items-baseline justify-between">
          {/* Once the number is settled there is no field left to label. */}
          {asked ? (
            <span className="text-[12.5px] font-extrabold text-muted">
              {t('auth.phoneLabel')}
            </span>
          ) : (
            <label
              className="text-[12.5px] font-extrabold text-muted"
              htmlFor="one-screen-phone"
            >
              {t('auth.phoneLabel')}
            </label>
          )}
          {asked ? (
            <button
              type="button"
              disabled={busy}
              onClick={controls.onChangeNumber}
              className="text-[11.5px] font-black text-steel"
            >
              {copy('changeNumber')}
            </button>
          ) : null}
        </div>

        {asked ? (
          <p
            dir="ltr"
            className="tabular text-start text-[19px] font-black text-ink"
          >
            {localSaudiMobile(step.phoneNumber)}
          </p>
        ) : (
          <>
            <input
              id="one-screen-phone"
              name="phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              inputMode="tel"
              autoFocus
              placeholder={t('auth.phonePlaceholder')}
              className="mb-2 w-full rounded-(--radius-control) border border-neutral-bg px-3 py-3 text-[19px] font-bold"
              value={controls.typed}
              onChange={(event) => controls.onTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') controls.onSendCode()
              }}
            />
            <p className="mb-4 text-[11px] font-bold text-muted">
              {t('auth.phoneHint')}
            </p>
            <Button
              tone="primary"
              disabled={busy}
              onClick={controls.onSendCode}
            >
              {t('auth.sendCode')}
            </Button>
          </>
        )}
      </Card>

      {/* The second half of the screen, present only once there is a code to
          type into it. Nothing above it moves when it opens. */}
      {asked ? (
        <Card>
          <p className="mb-1 text-[12.5px] font-extrabold text-muted">
            {t('auth.codeLabel')}
          </p>
          <p className="mb-3 text-[11px] font-bold text-muted">
            {copy('codeHint')}
          </p>

          <CodeBoxes
            code={controls.code}
            onCode={controls.onCode}
            busy={busy}
            label={(position) => copy('digit', { position })}
          />

          <p className="mt-3 text-center text-[11px] font-bold text-faint">
            {copy('autoSubmit')}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              disabled={busy || controls.secondsUntilResend > 0}
              onClick={controls.onResend}
              className="text-[11.5px] font-black text-steel disabled:text-faint"
            >
              {controls.secondsUntilResend > 0
                ? copy('resendIn', { seconds: controls.secondsUntilResend })
                : t('auth.resend')}
            </button>
            {/* Not `Button`: its width is the whole card, and this one sits
                beside the resend line. */}
            <button
              type="button"
              disabled={busy || controls.code.length < CODE_LENGTH}
              onClick={controls.onVerify}
              className="rounded-(--radius-control) bg-steel px-6 py-3 text-[14.5px] font-black text-white transition active:scale-[0.98] disabled:bg-neutral-bg disabled:text-faint"
            >
              {t('auth.verify')}
            </button>
          </div>
        </Card>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-(--radius-control) bg-bad-bg px-3.5 py-3 text-[12.5px] font-extrabold text-bad-text"
        >
          {error}
        </p>
      ) : null}
    </main>
  )
}

/**
 * Six boxes over one field. Typing moves forward, backspace moves back, and a
 * pasted SMS fills the lot: the code arrives on the same device it is typed
 * on, so pasting is the common case, not the exotic one.
 */
function CodeBoxes({
  code,
  onCode,
  busy,
  label,
}: {
  code: string
  onCode: (value: string) => void
  busy: boolean
  label: (position: number) => string
}) {
  const boxes = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    // Only on opening. Focus moves on a keystroke because the keystroke moves
    // it, not because this ran again.
    boxes.current[0]?.focus()
  }, [])

  const set = (index: number, digit: string) => {
    const next = code.padEnd(index, ' ').split('')
    next[index] = digit
    onCode(next.join('').replace(/\D/g, '').slice(0, CODE_LENGTH))
    if (digit) boxes.current[Math.min(index + 1, CODE_LENGTH - 1)]?.focus()
  }

  return (
    <div className="flex gap-2" dir="ltr">
      {Array.from({ length: CODE_LENGTH }, (_unused, index) => (
        <input
          key={index}
          ref={(element) => {
            boxes.current[index] = element
          }}
          aria-label={label(index + 1)}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={busy}
          value={code[index] ?? ''}
          className={cx(
            'tabular h-14 w-full rounded-(--radius-control) border-2 text-center text-[22px] font-black text-ink',
            code[index] ? 'border-steel bg-card' : 'border-neutral-bg bg-mist',
          )}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '')
            if (digits.length > 1) {
              onCode(digits.slice(0, CODE_LENGTH))
              boxes.current[CODE_LENGTH - 1]?.focus()
              return
            }
            set(index, digits)
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData
              .getData('text')
              .replace(/\D/g, '')
            if (!pasted) return
            event.preventDefault()
            onCode(pasted.slice(0, CODE_LENGTH))
            boxes.current[CODE_LENGTH - 1]?.focus()
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Backspace' || code[index]) return
            event.preventDefault()
            onCode(code.slice(0, Math.max(0, index - 1)))
            boxes.current[Math.max(0, index - 1)]?.focus()
          }}
        />
      ))}
    </div>
  )
}
