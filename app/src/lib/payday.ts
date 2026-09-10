/**
 * Everything falls due on the same weekday, so a merchant waits days rather
 * than a month for money he has already fronted, and a customer has one date
 * to remember rather than one per shop.
 *
 * Tuesday, per the business-model review in MVP.md. The prototype's monthly
 * 27th is the one thing on its screens that does not carry over.
 */
export const PAYDAY_WEEKDAY = 2 // Tuesday, counting from Sunday as 0.

/**
 * Saudi Arabia keeps one offset all year, so the day a moment falls on can be
 * worked out by shifting it rather than by asking a timezone database.
 */
const RIYADH_OFFSET_MINUTES = 3 * 60

const DAY_MS = 24 * 60 * 60 * 1000

function toRiyadh(at: Date) {
  return new Date(at.getTime() + RIYADH_OFFSET_MINUTES * 60 * 1000)
}

function fromRiyadh(at: Date) {
  return new Date(at.getTime() - RIYADH_OFFSET_MINUTES * 60 * 1000)
}

/** Midnight in Riyadh at the start of the day this moment falls on. */
export function startOfRiyadhDay(at: Date): Date {
  const local = toRiyadh(at)
  local.setUTCHours(0, 0, 0, 0)
  return fromRiyadh(local)
}

export function riyadhWeekday(at: Date): number {
  return toRiyadh(at).getUTCDay()
}

/**
 * The first pay-day on or after a moment. A purchase whose term lands exactly
 * on a Tuesday is due that Tuesday, not the week after: the term is the least
 * a shop waits, and rounding forward twice would make it a week more.
 */
export function paydayOnOrAfter(at: Date): Date {
  const start = startOfRiyadhDay(at)
  const ahead = (PAYDAY_WEEKDAY - riyadhWeekday(start) + 7) % 7
  return new Date(start.getTime() + ahead * DAY_MS)
}

/** When a purchase recorded now falls due, given the shop's term in days. */
export function dueDateFor(recordedAt: Date, termDays: number): Date {
  const earliest = new Date(
    startOfRiyadhDay(recordedAt).getTime() + termDays * DAY_MS,
  )
  return paydayOnOrAfter(earliest)
}

export type DueState = 'none' | 'open' | 'due_soon' | 'overdue'

/**
 * How close a due date is. Two days, so a customer hears about Tuesday on
 * Sunday, with a working day in between to do something about it.
 */
export const DUE_SOON_DAYS = 2

export function dueStateOf(dueAt: Date | null, now: Date): DueState {
  if (!dueAt) return 'none'

  const today = startOfRiyadhDay(now)
  const due = startOfRiyadhDay(dueAt)

  if (due.getTime() < today.getTime()) return 'overdue'
  if (due.getTime() - today.getTime() <= DUE_SOON_DAYS * DAY_MS) {
    return 'due_soon'
  }
  return 'open'
}

/** Whole days late, for a screen that says how long it has been. */
export function daysOverdue(dueAt: Date, now: Date): number {
  const difference =
    startOfRiyadhDay(now).getTime() - startOfRiyadhDay(dueAt).getTime()
  return Math.max(0, Math.round(difference / DAY_MS))
}
