import { EventEmitter } from 'node:events'

/**
 * #14: one stream per signed-in user. Railway runs one instance, so waking a
 * stream is an in-process signal; the durable `events` table is what makes the
 * signal safe to miss. Spreading over several instances needs a shared bus and
 * reopens #13 — nothing outside this file assumes one process forever.
 */
const waking = new EventEmitter()

// A shop with many customers can have many streams open at once.
waking.setMaxListeners(0)

export function wake(userIds: Array<string>) {
  for (const userId of new Set(userIds)) waking.emit(userId)
}

/** Calls `listener` when this user has something new, until the stream ends. */
export function onWake(userId: string, listener: () => void) {
  waking.on(userId, listener)
  return () => {
    waking.off(userId, listener)
  }
}
