/**
 * Saudi mobiles in E.164. The screen normalises what was typed, so the server
 * only ever sees one shape of the same number.
 */
export const SAUDI_MOBILE = /^\+9665\d{8}$/

export function normaliseSaudiMobile(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, '')
  const candidate = digits.startsWith('+966')
    ? digits
    : digits.startsWith('966')
      ? `+${digits}`
      : digits.startsWith('05')
        ? `+966${digits.slice(1)}`
        : digits.startsWith('5')
          ? `+966${digits}`
          : digits

  return SAUDI_MOBILE.test(candidate) ? candidate : null
}

/**
 * How a Saudi number is read aloud and written down: `0550 123 456`, not the
 * E.164 the database keeps. A number that is not one of ours is handed back
 * untouched rather than cut into groups that mean nothing.
 */
export function localSaudiMobile(e164: string): string {
  if (!SAUDI_MOBILE.test(e164)) return e164
  const digits = `0${e164.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
}

/**
 * A code that always works, for a deployment nobody can receive an SMS on.
 * When it is set, that is the code: the one written to the log is the same, so
 * the log never disagrees with what the screen accepts.
 *
 * Four to eight digits, and never in production, which the startup check
 * enforces. It is a key to every account on the deployment it is set on.
 */
export const FIXED_OTP_SHAPE = /^\d{4,8}$/

export function fixedOtpFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const code = env.OTP_FIXED_CODE?.trim()
  return code ? code : undefined
}
