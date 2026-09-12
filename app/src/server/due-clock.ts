import { describeError, log } from '#/lib/log'
import { startOfRiyadhDay } from '#/lib/payday'

/**
 * #78: how often to look at the clock. Not how often the ledger is read — see
 * below — but how soon after midnight in Riyadh a date that turned is
 * noticed, and an hour late on "this is due" is not late.
 */
const EVERY_MS = 60 * 60 * 1000

/**
 * #78: the clock that notices a due date. Time is what makes a date true, so
 * time is what looks for it — not the customer's dashboard, which used to
 * write notification rows while somebody waited for the slowest screen in the
 * app, and which left a customer who never opened it untold.
 *
 * A nitro plugin, so it starts with the server and not with a request. One
 * instance runs this app (#13), which is what makes an interval in the process
 * enough; the dedupe key on the rows is what makes it safe to run twice.
 */
export default function startDueClock() {
  /**
   * Which day's dates have been looked for. Every state on a date turns at
   * midnight in Riyadh, so there is nothing for a second look on the same day
   * to find — and a look is not free: every due date in this app falls on the
   * same Tuesday, so after one the whole ledger is overdue at once and every
   * row a round builds is a row that already exists. Measured on a ledger of
   * 630 accounts and 19,203 operations: 74ms to find nothing, against nothing
   * at all for reading a date off this variable.
   */
  let looked: number | null = null

  const sweep = async () => {
    const today = startOfRiyadhDay(new Date()).getTime()
    if (today === looked) return

    const { getDatabase } = await import('#/db/client')
    const { sweepDueDates } = await import('#/db/queries/notifications')
    const written = await sweepDueDates(getDatabase())
    looked = today
    if (written > 0) log.info('Dates that came round', { written })
  }

  const round = () => {
    void sweep().catch((error) => {
      // A date noticed an hour late is worth saying out loud and nothing more:
      // the next round writes it, and the row it writes is the same row.
      log.error('Could not look for due dates', { error: describeError(error) })
    })
  }

  round()
  // Unreferenced, so a server on its way out is not held open by the clock.
  setInterval(round, EVERY_MS).unref()
}
