import type { PushSender } from './types'

/**
 * Out-of-app push is what a real provider would add. The in-app bell does not
 * depend on it: a notification is a database row either way, written by the
 * caller before this is reached, so nothing is lost by logging and moving on.
 */
export function createLoggingPushSender(
  log: (message: string) => void = console.info,
): PushSender {
  return {
    name: 'log',
    async send(message) {
      log(`[push] ${message.userId}: ${message.title}`)
    },
  }
}
