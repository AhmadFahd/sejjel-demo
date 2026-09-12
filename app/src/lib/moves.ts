import type { EventKind } from '#/db/queries/events'

/**
 * #89: which of the ledger's events move a screen, said by the screen beside
 * how stale its answer may be.
 *
 * The stream answers an event by invalidating, and invalidating used to mark
 * every loaded and cached match — three reads a tab an event, the shell's, the
 * side layout's and the screen's, where usually one of them was about it.
 *
 * A screen declares this only when it can prove the answer, and silence means
 * everything: a screen that has not said what moves it is re-read, because a
 * read nobody needed costs a query and a screen nobody re-read shows a
 * merchant a balance that has moved. So the risk of forgetting falls the safe
 * way round.
 */
export type MovedBy = ReadonlyArray<EventKind>

/**
 * Nothing anybody else does moves this screen: what it reads is fixed, or it
 * is this person's own and their own writes invalidate it where they are made.
 */
export const NOTHING_MOVES_IT = { movedBy: [] } as const

/**
 * The shops asking to keep somebody, and the answer. Two screens carry that
 * list and nothing else that an event can touch.
 *
 * Nothing about the ledger is in here on purpose: a notification list is not
 * this, because a line in it is written by `announce` under the ledger's own
 * kind rather than under `notification.added`.
 */
export const CONNECTING = {
  movedBy: ['connection.requested', 'connection.accepted'],
} as const

/** Whether an event reaches a screen. */
export function moves(declared: MovedBy | undefined, kind: EventKind): boolean {
  return declared === undefined || declared.includes(kind)
}
