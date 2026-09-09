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
