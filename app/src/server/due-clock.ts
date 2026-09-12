import { describeError, log } from '#/lib/log'

/**
 * #78: how often to look for a date that has come round. Every due date in
 * this app falls on a Tuesday and every state on it turns at midnight in
 * Riyadh, so nothing needs noticing sooner than the hour it turns in.
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
  const sweep = async () => {
    const { getDatabase } = await import('#/db/client')
    const { sweepDueDates } = await import('#/db/queries/notifications')
    const written = await sweepDueDates(getDatabase())
    if (written > 0) log.info('Dates that came round', { written })
  }

  const round = () => {
    void sweep().catch((error) => {
      // A date that goes unnoticed for an hour is worth saying out loud and
      // nothing more: the next round writes it, and the row it would have
      // written is the same row.
      log.error('Could not look for due dates', { error: describeError(error) })
    })
  }

  round()
  // Unreferenced, so a server on its way out is not held open by the clock.
  setInterval(round, EVERY_MS).unref()
}
