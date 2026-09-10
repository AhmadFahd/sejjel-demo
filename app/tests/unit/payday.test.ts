import { describe, expect, it } from 'vitest'
import {
  DUE_SOON_DAYS,
  daysOverdue,
  dueDateFor,
  dueStateOf,
  paydayOnOrAfter,
  riyadhWeekday,
  startOfRiyadhDay,
} from '#/lib/payday'

/** Riyadh is UTC+3 all year, so 21:00 UTC is already tomorrow there. */
const riyadh = (iso: string) => new Date(`${iso}+03:00`)

describe('the Riyadh day', () => {
  it('starts three hours before it does in UTC', () => {
    expect(startOfRiyadhDay(riyadh('2026-09-15T09:00:00'))).toEqual(
      new Date('2026-09-14T21:00:00Z'),
    )
  })

  it('puts a late UTC evening on the next day, where the shop is', () => {
    // 22:00 UTC on Monday is 01:00 Tuesday in Riyadh.
    expect(riyadhWeekday(new Date('2026-09-14T22:00:00Z'))).toBe(2)
    expect(riyadhWeekday(new Date('2026-09-14T20:00:00Z'))).toBe(1)
  })
})

describe('paydayOnOrAfter', () => {
  it('leaves a Tuesday where it is, rather than pushing it a week', () => {
    const tuesday = riyadh('2026-09-15T11:00:00')
    expect(paydayOnOrAfter(tuesday)).toEqual(startOfRiyadhDay(tuesday))
  })

  it('takes a Wednesday to the following Tuesday, six days later', () => {
    expect(paydayOnOrAfter(riyadh('2026-09-16T11:00:00'))).toEqual(
      startOfRiyadhDay(riyadh('2026-09-22T00:00:00')),
    )
  })

  it('takes a Monday to the next day', () => {
    expect(paydayOnOrAfter(riyadh('2026-09-14T23:30:00'))).toEqual(
      startOfRiyadhDay(riyadh('2026-09-15T00:00:00')),
    )
  })
})

describe('dueDateFor', () => {
  const monday = riyadh('2026-09-14T10:00:00')

  it('is the first pay-day on or after the term', () => {
    // Seven days from Monday is the following Monday; the Tuesday after that.
    expect(dueDateFor(monday, 7)).toEqual(
      startOfRiyadhDay(riyadh('2026-09-22T00:00:00')),
    )
  })

  it('does not add a week when the term lands on a Tuesday', () => {
    // A day after Monday is Tuesday, and that is the day.
    expect(dueDateFor(monday, 1)).toEqual(
      startOfRiyadhDay(riyadh('2026-09-15T00:00:00')),
    )
  })

  it('never falls before the term is up', () => {
    for (const termDays of [1, 2, 3, 7, 14, 30, 45]) {
      const due = dueDateFor(monday, termDays)
      const earliest =
        startOfRiyadhDay(monday).getTime() + termDays * 86_400_000

      expect(due.getTime()).toBeGreaterThanOrEqual(earliest)
      expect(riyadhWeekday(due)).toBe(2)
    }
  })

  it('ignores the hour a purchase was recorded at', () => {
    const early = dueDateFor(riyadh('2026-09-14T00:05:00'), 7)
    const late = dueDateFor(riyadh('2026-09-14T23:55:00'), 7)

    expect(early).toEqual(late)
  })
})

describe('dueStateOf', () => {
  const due = riyadh('2026-09-15T00:00:00')

  it('says nothing about an account with no due date', () => {
    expect(dueStateOf(null, due)).toBe('none')
  })

  it('is open while the date is further off than the warning', () => {
    expect(dueStateOf(due, riyadh('2026-09-12T09:00:00'))).toBe('open')
  })

  it(`warns within ${DUE_SOON_DAYS} days, so Sunday hears about Tuesday`, () => {
    expect(dueStateOf(due, riyadh('2026-09-13T09:00:00'))).toBe('due_soon')
    expect(dueStateOf(due, riyadh('2026-09-14T23:00:00'))).toBe('due_soon')
  })

  it('is still due soon on the day itself, not yet late', () => {
    expect(dueStateOf(due, riyadh('2026-09-15T18:00:00'))).toBe('due_soon')
  })

  it('turns over on its own the moment the day does', () => {
    expect(dueStateOf(due, riyadh('2026-09-16T00:01:00'))).toBe('overdue')
  })
})

describe('daysOverdue', () => {
  it('counts whole days, from the day it was due', () => {
    const due = riyadh('2026-09-15T00:00:00')

    expect(daysOverdue(due, riyadh('2026-09-15T23:00:00'))).toBe(0)
    expect(daysOverdue(due, riyadh('2026-09-16T06:00:00'))).toBe(1)
    expect(daysOverdue(due, riyadh('2026-10-07T06:00:00'))).toBe(22)
  })
})
