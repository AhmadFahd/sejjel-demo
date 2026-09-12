import { useEffect, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { authClient } from '#/auth/client'
import { OTP_LENGTH } from '#/auth/otp'
import {
  LOCAL_MOBILE_LENGTH,
  groupLocalMobile,
  localSaudiMobile,
  normaliseSaudiMobile,
} from '#/auth/phone'
import { Button } from '#/components/chrome'
import { CodeBoxes } from '#/components/code-boxes'
import { LocaleToggle } from '#/components/locale-toggle'
import { useI18n } from '#/i18n/context'
import type { ReactNode } from 'react'

/**
 * How long the screen waits before offering another code. The server's rate
 * limit is what actually refuses; this only stops somebody spending it by
 * pressing the same button twice.
 */
const RESEND_SECONDS = 30

export const Route = createFileRoute('/sign-in')({ component: SignIn })

type Step = { name: 'phone' } | { name: 'code'; phoneNumber: string }

/**
 * What went wrong, not the sentence about it: the sentence is picked when it
 * is drawn, so switching language turns the error around with the screen.
 */
type Trouble = 'phoneInvalid' | 'codeWrong' | 'tooMany' | 'generic'

function digitsOf(value: string) {
  return value.replace(/\D/g, '')
}

/**
 * What the app is, with the way in over the top of it. Most people meet this
 * screen because a shop they already deal with sent them here, so the backdrop
 * answers "what is this" while the sheet, low enough to reach with a thumb,
 * takes the number. The sheet is the shape the app uses to ask for anything
 * else, so signing in is not a screen of its own kind.
 */
function SignIn() {
  const { t } = useI18n()
  const router = useRouter()

  const [step, setStep] = useState<Step>({ name: 'phone' })
  const [typed, setTyped] = useState('')
  const [code, setCode] = useState('')
  const [trouble, setTrouble] = useState<Trouble | null>(null)
  const [busy, setBusy] = useState(false)
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
    setTrouble(null)
    const { error: failure } = await authClient.phoneNumber.sendOtp({
      phoneNumber,
    })
    setBusy(false)
    if (failure) {
      setTrouble('generic')
      return false
    }
    setSentAt(Date.now())
    setNow(Date.now())
    return true
  }

  const onSendCode = async () => {
    const phoneNumber = normaliseSaudiMobile(typed)
    if (!phoneNumber) {
      setTrouble('phoneInvalid')
      return
    }
    if (await send(phoneNumber)) setStep({ name: 'code', phoneNumber })
  }

  /**
   * The code is handed in rather than read from state: on the keystroke that
   * completes it, the state is still one digit behind.
   */
  const onVerify = async (value: string) => {
    if (step.name !== 'code' || busy || value.length !== OTP_LENGTH) return
    setBusy(true)
    setTrouble(null)
    const { error: failure } = await authClient.phoneNumber.verify({
      phoneNumber: step.phoneNumber,
      code: value,
    })
    setBusy(false)

    if (failure) {
      // The server says only that it failed; it never says whether the number
      // is one it knows, which would turn this screen into a directory.
      setTrouble(failure.status === 429 ? 'tooMany' : 'codeWrong')
      // A refused code is cleared rather than left to be edited: the server
      // allows a handful of guesses, and editing one digit of six spends one
      // on each keystroke.
      setCode('')
      return
    }

    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <main className="flex min-h-dvh flex-col bg-ink text-white">
      <div className="px-7 pt-10 pb-8">
        <span
          className="grid size-12 place-items-center rounded-2xl bg-linear-135 from-gold-light via-gold to-gold-dark text-[22px] font-black text-ink"
          aria-hidden
        >
          {t('appName').slice(0, 1)}
        </span>
        <h1 className="mt-5 text-[27px] leading-tight font-black">
          {t('auth.hero')}
        </h1>

        <ul className="mt-5 grid gap-2.5">
          <Reason>{t('auth.reason.balance')}</Reason>
          <Reason>{t('auth.reason.pay')}</Reason>
          <Reason>{t('auth.reason.record')}</Reason>
        </ul>
      </div>

      {/* The sheet, and everything in it is dark on light: the backdrop paints
          its own text white, which a field on the sheet would inherit. */}
      <div className="mt-auto rounded-t-3xl bg-mist px-5 pt-3 pb-7 text-ink">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-bg" />

        <div className="mb-3 flex justify-end">
          <LocaleToggle className="border border-neutral-bg bg-card text-steel" />
        </div>

        {step.name === 'phone' ? (
          <>
            <h2 className="mb-3 text-base font-black">{t('auth.title')}</h2>
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
              className="tabular mb-2 w-full rounded-(--radius-control) border border-neutral-bg bg-card px-3.5 py-3.5 text-[19px] font-bold text-ink placeholder:text-faint"
              value={groupLocalMobile(typed)}
              onChange={(event) =>
                setTyped(
                  digitsOf(event.target.value).slice(0, LOCAL_MOBILE_LENGTH),
                )
              }
              onKeyDown={(event) => {
                // The spaces between the groups are not there to be deleted,
                // so a deletion always takes a digit with it.
                if (event.key === 'Backspace') {
                  event.preventDefault()
                  setTyped(typed.slice(0, -1))
                }
                if (event.key === 'Enter') void onSendCode()
              }}
            />
            <p className="mb-4 text-[11px] font-bold text-muted">
              {t('auth.phoneHint')}
            </p>
            <Button tone="gold" disabled={busy} onClick={onSendCode}>
              {t('auth.sendCode')}
            </Button>
            <p className="mt-3 text-center text-[11px] font-bold text-muted">
              {t('auth.trust')}
            </p>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-base font-black">{t('auth.codeLabel')}</h2>
            <p className="mb-4 text-[11.5px] font-bold text-muted">
              {t('auth.codeWentTo')}{' '}
              {/* A number inside Arabic text needs its own direction, or the
                  groups come out in the wrong order. */}
              <bdi dir="ltr" className="tabular font-black text-ink">
                {localSaudiMobile(step.phoneNumber)}
              </bdi>
              {' · '}
              <button
                type="button"
                disabled={busy}
                className="font-black text-steel"
                onClick={() => {
                  setCode('')
                  setTrouble(null)
                  setSentAt(null)
                  setStep({ name: 'phone' })
                }}
              >
                {t('auth.changeNumber')}
              </button>
            </p>

            <CodeBoxes
              code={code}
              onCode={setCode}
              onComplete={(value) => void onVerify(value)}
              disabled={busy}
              takeFocus
            />

            <p className="mt-3 mb-4 text-center text-[11px] font-bold text-faint">
              {t('auth.codeAuto')}
            </p>

            {/* A code that was refused, or a request that failed, needs a way
                to be sent again: the completed code does not resubmit itself. */}
            <Button
              tone="gold"
              disabled={busy || code.length < OTP_LENGTH}
              onClick={() => void onVerify(code)}
            >
              {t('auth.verify')}
            </Button>

            <button
              type="button"
              disabled={busy || secondsUntilResend > 0}
              onClick={() => void send(step.phoneNumber)}
              className="mt-2 w-full py-2 text-[11.5px] font-black text-steel disabled:text-faint"
            >
              {secondsUntilResend > 0
                ? t('auth.resendIn', { seconds: secondsUntilResend })
                : t('auth.resend')}
            </button>
          </>
        )}

        {trouble ? (
          <p
            role="alert"
            className="mt-4 rounded-(--radius-control) bg-bad-bg px-3.5 py-3 text-[12.5px] font-extrabold text-bad-text"
          >
            {t(`auth.error.${trouble}`)}
          </p>
        ) : null}
      </div>
    </main>
  )
}

/** One thing the ledger does, on the backdrop behind the sheet. */
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
