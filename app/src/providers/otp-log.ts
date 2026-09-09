import type { OtpSender } from './types'

/**
 * Writes the code where a developer can read it. Never in a response: the
 * browser must not learn a code it did not receive by SMS.
 */
export function createLoggingOtpSender(
  log: (message: string) => void = console.info,
): OtpSender {
  return {
    name: 'log',
    async send({ mobile, code }) {
      log(`[otp] ${mobile} → ${code}`)
    },
  }
}
