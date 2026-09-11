import { localSaudiMobile } from '#/auth/phone'
import { Button } from '#/components/chrome'
import { cx } from '#/components/primitives'
import { useI18n } from '#/i18n/context'
import { CODE_LENGTH, SWITCHER_CLEARANCE, useAutoSubmit } from './shared'
import { prototypeCopy } from './strings'
import type { ReactNode } from 'react'
import type { SignInControls } from './shared'

/**
 * Signing in over the top of the app's own argument. Most people meet this
 * screen having been sent here by a shop they already deal with, and the
 * backdrop answers "what is this" while the sheet, low enough to reach with a
 * thumb, takes the number. The sheet is the app's own confirmation sheet, so
 * signing in looks like every other thing the app asks of them.
 */
export function VariantSheet({ controls }: { controls: SignInControls }) {
  const { t, locale } = useI18n()
  const copy = prototypeCopy(locale)
  const { step, error, busy } = controls

  useAutoSubmit(controls.code, busy, controls.onVerify)

  return (
    <main className="flex min-h-dvh flex-col bg-linear-to-b from-ink to-[#3a4842] text-white">
      <div className="px-7 pt-10 pb-8">
        <span
          className="grid size-12 place-items-center rounded-2xl bg-linear-135 from-gold-light via-gold to-gold-dark text-[22px] font-black text-ink"
          aria-hidden
        >
          {t('appName').slice(0, 1)}
        </span>
        <h1 className="mt-5 text-[27px] leading-tight font-black">
          {copy('hero')}
        </h1>

        <ul className="mt-5 grid gap-2.5">
          <Reason>{copy('reasonBalance')}</Reason>
          <Reason>{copy('reasonPay')}</Reason>
          <Reason>{copy('reasonRecord')}</Reason>
        </ul>
      </div>

      <div
        className={cx(
          'mt-auto rounded-t-3xl bg-mist px-5 pt-3 pb-7',
          SWITCHER_CLEARANCE,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-bg" />

        {step.name === 'phone' ? (
          <>
            <h2 className="mb-3 text-base font-black text-ink">
              {copy('sheetTitle')}
            </h2>
            <label
              className="mb-1 block text-[12.5px] font-extrabold text-muted"
              htmlFor="sheet-phone"
            >
              {t('auth.phoneLabel')}
            </label>
            <input
              id="sheet-phone"
              name="phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              inputMode="tel"
              placeholder={t('auth.phonePlaceholder')}
              // The backdrop paints everything white, including what is typed
              // into a field on the sheet, so the sheet says its own colours.
              className="mb-4 w-full rounded-(--radius-control) border border-neutral-bg bg-card px-3.5 py-3.5 text-[19px] font-bold text-ink placeholder:text-faint"
              value={controls.typed}
              onChange={(event) => controls.onTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') controls.onSendCode()
              }}
            />
            <Button tone="gold" disabled={busy} onClick={controls.onSendCode}>
              {t('auth.sendCode')}
            </Button>
            <p className="mt-3 text-center text-[11px] font-bold text-muted">
              {copy('trust')}
            </p>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-base font-black text-ink">
              {t('auth.codeLabel')}
            </h2>
            <p className="mb-4 text-[11.5px] font-bold text-muted">
              {copy('sentTo')}{' '}
              <bdi dir="ltr" className="tabular font-black text-ink">
                {localSaudiMobile(step.phoneNumber)}
              </bdi>
              {' · '}
              <button
                type="button"
                disabled={busy}
                onClick={controls.onChangeNumber}
                className="font-black text-steel"
              >
                {copy('changeNumber')}
              </button>
            </p>
            <label className="sr-only" htmlFor="sheet-code">
              {t('auth.codeLabel')}
            </label>
            <input
              id="sheet-code"
              name="code"
              type="text"
              dir="ltr"
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              maxLength={CODE_LENGTH}
              placeholder="––––––"
              className="tabular mb-3 w-full rounded-(--radius-control) border-2 border-steel bg-card py-4 text-center text-[30px] font-black tracking-[0.35em] text-ink placeholder:text-faint"
              value={controls.code}
              onChange={(event) =>
                controls.onCode(
                  event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH),
                )
              }
            />
            <button
              type="button"
              disabled={busy || controls.secondsUntilResend > 0}
              onClick={controls.onResend}
              className="mb-1 w-full py-2 text-center text-[12px] font-black text-steel disabled:text-faint"
            >
              {controls.secondsUntilResend > 0
                ? copy('resendIn', { seconds: controls.secondsUntilResend })
                : t('auth.resend')}
            </button>
            <p className="text-center text-[11px] font-bold text-faint">
              {copy('autoSubmit')}
            </p>
          </>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-(--radius-control) bg-bad-bg px-3.5 py-3 text-[12.5px] font-extrabold text-bad-text"
          >
            {error}
          </p>
        ) : null}
      </div>
    </main>
  )
}

function Reason({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-[13px] font-extrabold text-white/85">
      <span
        className="grid size-5 flex-none place-items-center rounded-full bg-gold/25 text-[11px] text-gold-light"
        aria-hidden
      >
        ✓
      </span>
      {children}
    </li>
  )
}
