import { describe, expect, it } from 'vitest'
import { CONNECTING, NOTHING_MOVES_IT, moves } from '#/lib/moves'
import type { EventKind } from '#/db/queries/events'

const EVERY_KIND: Array<EventKind> = [
  'purchase.recorded',
  'purchase.applied',
  'purchase.cancelled',
  'payment.received',
  'connection.requested',
  'connection.accepted',
  'terms.changed',
  'notification.added',
  'notification.read',
]

describe('#89: which events reach a screen', () => {
  it('reaches a screen that has not said what moves it, whatever the kind', () => {
    // The direction the risk has to fall: a read nobody needed costs a query,
    // and a screen nobody re-read shows a balance that has moved.
    for (const kind of EVERY_KIND) {
      expect(moves(undefined, kind)).toBe(true)
    }
  })

  it('reaches a screen nothing moves, for no kind at all', () => {
    for (const kind of EVERY_KIND) {
      expect(moves(NOTHING_MOVES_IT.movedBy, kind)).toBe(false)
    }
  })

  it('reaches the screens that carry the asking, on those two kinds only', () => {
    const reached = EVERY_KIND.filter((kind) => moves(CONNECTING.movedBy, kind))

    expect(reached).toEqual(['connection.requested', 'connection.accepted'])
  })

  /**
   * The trap this ticket was written around, kept as a test so the next
   * person meets it here rather than on a screen: a line in somebody's
   * notification list is written by `announce` under the ledger's own kind,
   * so a list that declared only the notification kinds would miss every
   * line it is for. Both lists are silent for that reason, and silence is
   * what this asserts.
   */
  it('reaches a notification list on a purchase, because that is how a line arrives', () => {
    expect(moves(undefined, 'purchase.recorded')).toBe(true)
    expect(moves(undefined, 'payment.received')).toBe(true)
  })
})
