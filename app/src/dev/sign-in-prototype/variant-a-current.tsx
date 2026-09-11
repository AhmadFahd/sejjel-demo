import { Button } from '#/components/chrome'
import { Card } from '#/components/primitives'
import { useI18n } from '#/i18n/context'
import type { SignInControls } from './shared'

/**
 * Today's screen, unchanged, so the other three are judged against something
 * rather than against a memory. It is also what `/sign-in` renders with no
 * `?variant=`, which keeps the browser tests pointed at the real design.
 */
export function VariantCurrent({ controls }: { controls: SignInControls }) {
  const { t } = useI18n()
  const { step, typed, code, error, busy } = controls

  return (
    <main className="mx-auto max-w-sm px-6 py-10">
      <h1 className="mb-6 text-2xl font-black text-ink">{t('auth.title')}</h1>

      <Card>
        {step.name === 'phone' ? (
          <>
            <label
              className="mb-1 block text-[12.5px] font-extrabold text-muted"
              htmlFor="phone"
            >
              {t('auth.phoneLabel')}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              inputMode="tel"
              placeholder={t('auth.phonePlaceholder')}
              className="mb-2 w-full rounded-(--radius-control) border border-neutral-bg px-3 py-3 text-base"
              value={typed}
              onChange={(event) => controls.onTyped(event.target.value)}
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
        ) : (
          <>
            <label
              className="mb-1 block text-[12.5px] font-extrabold text-muted"
              htmlFor="code"
            >
              {t('auth.codeLabel')}
            </label>
            <p className="mb-2 text-[11px] font-bold text-muted">
              {t('auth.codeSentTo', { phoneNumber: step.phoneNumber })}
            </p>
            <input
              id="code"
              name="code"
              type="text"
              dir="ltr"
              autoComplete="one-time-code"
              inputMode="numeric"
              className="mb-4 w-full rounded-(--radius-control) border border-neutral-bg px-3 py-3 text-center text-2xl tracking-[0.4em]"
              value={code}
              onChange={(event) =>
                controls.onCode(event.target.value.replace(/\D/g, ''))
              }
            />
            <Button tone="primary" disabled={busy} onClick={controls.onVerify}>
              {t('auth.verify')}
            </Button>
            <div className="mt-3 flex gap-2.5">
              <Button tone="ghost" disabled={busy} onClick={controls.onResend}>
                {t('auth.resend')}
              </Button>
              <Button
                tone="soft"
                disabled={busy}
                onClick={controls.onChangeNumber}
              >
                {t('auth.changeNumber')}
              </Button>
            </div>
          </>
        )}

        {error ? (
          <p
            role="alert"
            className="mt-4 text-[12.5px] font-extrabold text-bad-text"
          >
            {error}
          </p>
        ) : null}
      </Card>
    </main>
  )
}
