import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { authClient } from '#/auth/client'
import { normaliseSaudiMobile } from '#/auth/phone'
import { Button } from '#/components/chrome'
import { Card } from '#/components/primitives'
import { useI18n } from '#/i18n/context'

export const Route = createFileRoute('/sign-in')({ component: SignIn })

type Step = { name: 'phone' } | { name: 'code'; phoneNumber: string }

function SignIn() {
  const { t } = useI18n()
  const router = useRouter()
  const [step, setStep] = useState<Step>({ name: 'phone' })
  const [typed, setTyped] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const send = async (phoneNumber: string) => {
    setBusy(true)
    setError(null)
    const { error: failure } = await authClient.phoneNumber.sendOtp({
      phoneNumber,
    })
    setBusy(false)
    if (failure) {
      setError(t('auth.error.generic'))
      return false
    }
    return true
  }

  const onSendCode = async () => {
    const phoneNumber = normaliseSaudiMobile(typed)
    if (!phoneNumber) {
      setError(t('auth.error.phoneInvalid'))
      return
    }
    if (await send(phoneNumber)) setStep({ name: 'code', phoneNumber })
  }

  const onVerify = async () => {
    if (step.name !== 'code') return
    setBusy(true)
    setError(null)
    const { error: failure } = await authClient.phoneNumber.verify({
      phoneNumber: step.phoneNumber,
      code,
    })
    setBusy(false)

    if (failure) {
      // The server says only that it failed; it never says whether the number
      // is one it knows, which would turn this screen into a directory.
      setError(
        failure.status === 429
          ? t('auth.error.tooMany')
          : t('auth.error.codeWrong'),
      )
      return
    }

    await router.invalidate()
    await router.navigate({ to: '/' })
  }

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
              onChange={(event) => setTyped(event.target.value)}
            />
            <p className="mb-4 text-[11px] font-bold text-muted">
              {t('auth.phoneHint')}
            </p>
            <Button tone="primary" disabled={busy} onClick={onSendCode}>
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
                setCode(event.target.value.replace(/\D/g, ''))
              }
            />
            <Button tone="primary" disabled={busy} onClick={onVerify}>
              {t('auth.verify')}
            </Button>
            <div className="mt-3 flex gap-2.5">
              <Button
                tone="ghost"
                disabled={busy}
                onClick={() => send(step.phoneNumber)}
              >
                {t('auth.resend')}
              </Button>
              <Button
                tone="soft"
                disabled={busy}
                onClick={() => {
                  setCode('')
                  setError(null)
                  setStep({ name: 'phone' })
                }}
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
