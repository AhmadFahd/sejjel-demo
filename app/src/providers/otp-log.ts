import { appendFileSync } from 'node:fs'
import type { OtpSender } from './types'

/**
 * Writes the code where a developer can read it. Never in a response: the
 * browser must not learn a code it did not receive by SMS.
 */
export function createLoggingOtpSender(
  log: (message: string) => void = console.info,
  /**
   * Where the browser tests read the code from. A file, not an endpoint: an
   * endpoint that hands out codes is a way in, however well guarded.
   */
  sink: string | undefined = process.env.OTP_LOG_FILE,
): OtpSender {
  return {
    name: 'log',
    async send({ phoneNumber, code }) {
      log(`[otp] ${phoneNumber} → ${code}`)
      if (sink) appendFileSync(sink, `${phoneNumber} ${code}\n`)
    },
  }
}
