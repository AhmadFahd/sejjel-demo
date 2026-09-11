import { useEffect, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { authClient } from '#/auth/client'
import { normaliseSaudiMobile } from '#/auth/phone'
import { PrototypeSwitcher } from '#/components/prototype-switcher'
import { useI18n } from '#/i18n/context'
import { SIGN_IN_VARIANTS, resolveVariant } from '#/dev/sign-in-prototype'
import { RESEND_SECONDS } from '#/dev/sign-in-prototype/shared'
import type { SignInControls, SignInStep } from '#/dev/sign-in-prototype/shared'

export const Route = createFileRoute('/sign-in')({
  /**
   * PROTOTYPE: `?variant=` picks one of the sign-in screens in
   * `src/dev/sign-in-prototype`. Absent or unknown is today's screen, so the
   * param only ever adds a prototype, never takes the real one away.
   */
  validateSearch: (search: Record<string, unknown>): { variant?: string } =>
    typeof search.variant === 'string' ? { variant: search.variant } : {},
  component: SignIn,
})

function SignIn() {
  const { t } = useI18n()
  const router = useRouter()
  const { variant: variantKey } = Route.useSearch()
  const navigate = Route.useNavigate()

  const [step, setStep] = useState<SignInStep>({ name: 'phone' })
  const [typed, setTyped] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /**
   * When the last code went out, so a screen can say how long it will be
   * before another one is worth asking for. The server's own rate limit is
   * what actually refuses; this only keeps somebody from hammering it.
   */
  const [sentAt, setSentAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const secondsUntilResend =
    sentAt === null
      ? 0
      : Math.max(0, RESEND_SECONDS - Math.floor((now - sentAt) / 1000))

  useEffect(() => {
    if (secondsUntilResend === 0) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [secondsUntilResend])

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
    setSentAt(Date.now())
    setNow(Date.now())
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
    if (step.name !== 'code' || busy) return
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

  const controls: SignInControls = {
    step,
    typed,
    onTyped: setTyped,
    code,
    onCode: setCode,
    error,
    busy,
    secondsUntilResend,
    onSendCode,
    onVerify,
    onResend: () => {
      if (step.name === 'code') void send(step.phoneNumber)
    },
    onChangeNumber: () => {
      setCode('')
      setError(null)
      setSentAt(null)
      setStep({ name: 'phone' })
    },
  }

  const variant = resolveVariant(variantKey)

  return (
    <>
      <variant.Component controls={controls} />
      <PrototypeSwitcher
        variants={SIGN_IN_VARIANTS}
        current={variant.key}
        onSelect={(key) =>
          void navigate({ search: { variant: key }, replace: true })
        }
      />
    </>
  )
}
