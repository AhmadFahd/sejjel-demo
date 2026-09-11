import { localSaudiMobile } from '#/auth/phone'
import { cx } from '#/components/primitives'
import { useI18n } from '#/i18n/context'
import {
  CODE_LENGTH,
  SWITCHER_CLEARANCE,
  digitsOf,
  groupLocalDigits,
} from './shared'
import { prototypeCopy } from './strings'
import type { SignInControls } from './shared'

/**
 * The whole screen is a keypad. Nothing here summons the phone's own
 * keyboard, so a shopkeeper holding the phone in one hand never has a
 * keyboard covering half of what they are reading, and the number is typed
 * with targets the size of a thumb.
 */
export function VariantKeypad({ controls }: { controls: SignInControls }) {
  const { t, locale } = useI18n()
  const copy = prototypeCopy(locale)
  const { step, error, busy } = controls

  const onPhone = step.name === 'phone'
  const typedDigits = digitsOf(controls.typed).slice(0, 10)
  const value = onPhone ? typedDigits : controls.code

  const press = (digit: string) => {
    if (onPhone) controls.onTyped((typedDigits + digit).slice(0, 10))
    else controls.onCode((controls.code + digit).slice(0, CODE_LENGTH))
  }

  const back = () => {
    if (onPhone) controls.onTyped(typedDigits.slice(0, -1))
    else controls.onCode(controls.code.slice(0, -1))
  }

  const clear = () => (onPhone ? controls.onTyped('') : controls.onCode(''))

  return (
    <main
      className={cx(
        'flex min-h-dvh flex-col bg-ink px-6 pt-8 pb-6 text-white',
        SWITCHER_CLEARANCE,
      )}
    >
      <p className="text-[11px] font-extrabold text-white/50">
        {copy('stepOf', { current: onPhone ? 1 : 2, total: 2 })}
      </p>
      <h1 className="mt-1 text-[22px] leading-tight font-black">
        {onPhone ? copy('hero') : t('auth.codeLabel')}
      </h1>
      <p className="mt-1 text-[12px] font-bold text-gold-light">
        {onPhone ? (
          copy('trust')
        ) : (
          <>
            {copy('sentTo')}{' '}
            {/* A number inside Arabic text needs its own direction, or the
                groups come out in the wrong order. */}
            <bdi dir="ltr" className="tabular">
              {localSaudiMobile(step.phoneNumber)}
            </bdi>
          </>
        )}
      </p>

      <label className="sr-only" htmlFor="keypad-display">
        {onPhone ? t('auth.phoneLabel') : t('auth.codeLabel')}
      </label>
      <input
        id="keypad-display"
        readOnly
        dir="ltr"
        inputMode="none"
        placeholder={onPhone ? t('auth.phonePlaceholder') : '––––––'}
        value={onPhone ? groupLocalDigits(typedDigits) : value}
        className={cx(
          'tabular my-7 w-full border-b-2 border-white/20 bg-transparent pb-3 text-center font-black text-white placeholder:text-white/25',
          onPhone ? 'text-[30px]' : 'text-[34px] tracking-[0.35em]',
        )}
      />

      <Keypad
        onDigit={press}
        onBackspace={back}
        onClear={clear}
        backspaceLabel={copy('backspace')}
        clearLabel={copy('clear')}
      />

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-(--radius-control) bg-bad/25 px-3 py-2.5 text-center text-[12.5px] font-extrabold text-white"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-auto pt-6">
        <button
          type="button"
          disabled={busy}
          onClick={onPhone ? controls.onSendCode : controls.onVerify}
          className="w-full rounded-(--radius-control) bg-linear-135 from-gold-light to-gold p-4 text-[15px] font-black text-ink transition active:scale-[0.98] disabled:opacity-50"
        >
          {onPhone ? t('auth.sendCode') : t('auth.verify')}
        </button>

        {onPhone ? (
          <p className="mt-3 text-center text-[11px] font-bold text-white/50">
            {copy('keypadHint')}
          </p>
        ) : (
          <div className="mt-3 flex items-center justify-between text-[11.5px] font-extrabold">
            <button
              type="button"
              disabled={busy || controls.secondsUntilResend > 0}
              onClick={controls.onResend}
              className="text-gold-light disabled:text-white/35"
            >
              {controls.secondsUntilResend > 0
                ? copy('resendIn', { seconds: controls.secondsUntilResend })
                : t('auth.resend')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={controls.onChangeNumber}
              className="text-white/70"
            >
              {copy('changeNumber')}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function Keypad({
  onDigit,
  onBackspace,
  onClear,
  backspaceLabel,
  clearLabel,
}: {
  onDigit: (digit: string) => void
  onBackspace: () => void
  onClear: () => void
  backspaceLabel: string
  clearLabel: string
}) {
  const key =
    'tabular rounded-2xl bg-white/10 py-4 text-[24px] font-black text-white transition active:scale-[0.97] active:bg-white/20'

  return (
    // The keypad reads the same way in either language, so it is laid out
    // left to right whatever the document direction is.
    <div className="grid grid-cols-3 gap-2.5" dir="ltr">
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          className={key}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        className={cx(key, 'text-[13px] text-white/60')}
        onClick={onClear}
      >
        {clearLabel}
      </button>
      <button type="button" className={key} onClick={() => onDigit('0')}>
        0
      </button>
      <button
        type="button"
        aria-label={backspaceLabel}
        className={cx(key, 'text-[20px]')}
        onClick={onBackspace}
      >
        ⌫
      </button>
    </div>
  )
}
