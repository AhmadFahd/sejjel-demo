import { log } from '#/lib/log'
import type { PushMessage, PushSender } from './types'

/**
 * Out-of-app push is what a real provider would add. The in-app bell does not
 * depend on it: a notification is a database row either way, written by the
 * caller before this is reached, so nothing is lost by logging and moving on.
 */
export function createLoggingPushSender(
  write: (message: PushMessage) => void = (message) =>
    log.info('A push that would have gone to a device', {
      userId: message.userId,
      title: message.title,
    }),
): PushSender {
  return {
    name: 'log',
    async send(message) {
      write(message)
    },
  }
}
