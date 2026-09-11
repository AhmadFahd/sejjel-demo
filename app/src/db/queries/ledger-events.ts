import { recordEvents } from './events'
import { wake } from '#/server/stream.server'
import type { Database } from '../client'
import type { EventKind } from './events'

/**
 * Writing an event and waking the streams that care is one act, so no caller
 * can do half of it: a row nobody is woken for arrives late, and a wake with
 * no row behind it tells a reconnecting client nothing.
 */
export async function announce(
  db: Database,
  entries: Array<{ userId: string; kind: EventKind; subjectId?: string }>,
) {
  const rows = await recordEvents(db, entries)
  wake(entries.map((entry) => entry.userId))
  return rows
}
