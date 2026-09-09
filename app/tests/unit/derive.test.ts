import { describe, expect, it } from 'vitest'
import {
  availableOf,
  balanceOf,
  countOperations,
  limitOf,
  statusOf,
  termOf,
  wouldBreachLimit,
} from '#/db/derive'
import type { LedgerEntry } from '#/db/derive'
import { parseAmount, riyalsToHalalas } from '#/lib/money'

const purchase = (riyals: number, status: LedgerEntry['status'] = 'applied') =>
  ({
    kind: 'purchase',
    status,
    amountHalalas: riyalsToHalalas(riyals),
  }) satisfies LedgerEntry

const payment = (riyals: number, status: LedgerEntry['status'] = 'applied') =>
  ({
    kind: 'payment',
    status,
    amountHalalas: riyalsToHalalas(riyals),
  }) satisfies LedgerEntry

describe('balanceOf', () => {
  it('adds purchases and subtracts payments', () => {
    expect(balanceOf([purchase(1000), payment(200)])).toBe(riyalsToHalalas(800))
  })

  it('ignores anything not applied', () => {
    const entries = [
      purchase(1000),
      purchase(500, 'pending'),
      purchase(500, 'cancelled'),
      payment(200, 'failed'),
    ]
    expect(balanceOf(entries)).toBe(riyalsToHalalas(1000))
  })

  it('is zero for an account with no history', () => {
    expect(balanceOf([])).toBe(0)
  })
})

describe('limits', () => {
  const shopDefaults = {
    defaultLimitHalalas: riyalsToHalalas(1000),
    defaultTermDays: 30,
  }

  it('falls back to the shop default when there is no override', () => {
    const source = {
      ...shopDefaults,
      limitOverrideHalalas: null,
      termOverrideDays: null,
    }
    expect(limitOf(source)).toBe(riyalsToHalalas(1000))
    expect(termOf(source)).toBe(30)
  })

  it('takes the override when one is set', () => {
    const source = {
      ...shopDefaults,
      limitOverrideHalalas: riyalsToHalalas(1500),
      termOverrideDays: 14,
    }
    expect(limitOf(source)).toBe(riyalsToHalalas(1500))
    expect(termOf(source)).toBe(14)
  })

  it('never reports negative headroom', () => {
    expect(availableOf(riyalsToHalalas(1250), riyalsToHalalas(1000))).toBe(0)
  })
})

describe('wouldBreachLimit', () => {
  const limit = riyalsToHalalas(1000)

  it('allows a purchase landing exactly on the limit', () => {
    expect(
      wouldBreachLimit(riyalsToHalalas(800), limit, riyalsToHalalas(200)),
    ).toBe(false)
  })

  it('refuses one halala over', () => {
    expect(wouldBreachLimit(riyalsToHalalas(800), limit, 20001)).toBe(true)
  })
})

describe('statusOf', () => {
  const now = new Date('2026-09-02T00:00:00Z')
  const limit = riyalsToHalalas(1000)

  it('is settled at or below zero, whatever the date says', () => {
    const state = statusOf({
      balanceHalalas: 0,
      limitHalalas: limit,
      dueAt: new Date('2026-07-27T00:00:00Z'),
      now,
    })
    expect(state).toBe('settled')
  })

  it('puts overdue ahead of the limit', () => {
    const state = statusOf({
      balanceHalalas: riyalsToHalalas(1250),
      limitHalalas: limit,
      dueAt: new Date('2026-07-27T00:00:00Z'),
      now,
    })
    expect(state).toBe('overdue')
  })

  it('reports the limit when the balance has reached it and the date has not passed', () => {
    const state = statusOf({
      balanceHalalas: limit,
      limitHalalas: limit,
      dueAt: new Date('2026-09-08T00:00:00Z'),
      now,
    })
    expect(state).toBe('at_limit')
  })

  it('is an open account otherwise', () => {
    const state = statusOf({
      balanceHalalas: riyalsToHalalas(800),
      limitHalalas: limit,
      dueAt: new Date('2026-09-08T00:00:00Z'),
      now,
    })
    expect(state).toBe('open')
  })
})

describe('countOperations', () => {
  it('counts applied purchases and payments separately', () => {
    const counted = countOperations([
      purchase(1000),
      payment(200),
      purchase(50, 'pending'),
    ])
    expect(counted).toEqual({ total: 2, purchases: 1, payments: 1 })
  })
})

describe('parseAmount', () => {
  it.each([
    ['120', 12000],
    ['120.5', 12050],
    ['1,250', 125000],
    ['0.99', 99],
  ])('reads %s as %d halalas', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each(['', '0', '-5', 'abc', '12.345', '12٫3٫4'])('refuses %s', (input) => {
    expect(parseAmount(input)).toBeNull()
  })
})
