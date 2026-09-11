import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/** Six digits is what Better Auth's phone plugin generates. */
export const CODE_LENGTH = 6

/** How long a variant makes someone wait before offering another code. */
export const RESEND_SECONDS = 30

export type SignInStep =
  { name: 'phone' } | { name: 'code'; phoneNumber: string }

/**
 * Everything a variant needs and nothing it can decide for itself. The route
 * keeps the state machine and the two mutations; a variant only renders, so
 * flipping between variants cannot change what signing in does.
 */
export type SignInControls = {
  step: SignInStep
  /** The digits as typed, not normalised: `0550123456`, `+966550123456`, either. */
  typed: string
  onTyped: (value: string) => void
  code: string
  onCode: (value: string) => void
  error: string | null
  busy: boolean
  /** Zero once another code may be asked for. */
  secondsUntilResend: number
  onSendCode: () => void
  onVerify: () => void
  onResend: () => void
  onChangeNumber: () => void
}

export type SignInVariant = {
  key: string
  /** Shown in the switcher, so it says what the variant argues for. */
  name: string
  Component: (props: { controls: SignInControls }) => ReactNode
}

/**
 * Room at the bottom of a design that anchors its own action there, so the
 * switcher bar does not sit on top of the button being judged. Development
 * only: the bar is not in a production build either.
 */
export const SWITCHER_CLEARANCE = import.meta.env.PROD ? '' : 'pb-24'

export function digitsOf(value: string) {
  return value.replace(/\D/g, '')
}

/**
 * A local number as it is being typed: `0550 123 456`, cut wherever the
 * typing stopped. `localSaudiMobile` groups a finished E.164 number; this
 * groups a half-finished one, which is what a keypad display shows.
 */
export function groupLocalDigits(digits: string) {
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 10)]
    .filter(Boolean)
    .join(' ')
}

/**
 * Sends the code the moment it is complete, and only once per code: a refused
 * code sits in the boxes, and without the guard the release of `busy` would
 * send the same wrong code again, forever.
 */
export function useAutoSubmit(
  code: string,
  busy: boolean,
  onVerify: () => void,
) {
  const sent = useRef<string | null>(null)

  useEffect(() => {
    if (busy || code.length !== CODE_LENGTH) return
    if (sent.current === code) return
    sent.current = code
    onVerify()
  }, [busy, code, onVerify])
}
