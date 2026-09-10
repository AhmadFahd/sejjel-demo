import { appendFileSync } from 'node:fs'
import { log } from '#/lib/log'
import type { OtpSender } from './types'

/**
 * Writes the code where a developer can read it. Never in a response: the
 * browser must not learn a code it did not receive by SMS.
 */
export function createLoggingOtpSender(
  write: (phoneNumber: string, code: string) => void = (phoneNumber, code) =>
    log.info('An OTP that would have gone by SMS', { phoneNumber, code }),
  /**
   * Where the browser tests read the code from. A file, not an endpoint: an
   * endpoint that hands out codes is a way in, however well guarded.
   */
  sink: string | undefined = process.env.OTP_LOG_FILE,
): OtpSender {
  return {
    name: 'log',
    async send({ phoneNumber, code }) {
      write(phoneNumber, code)
      if (sink) appendFileSync(sink, `${phoneNumber} ${code}\n`)
    },
  }
}
