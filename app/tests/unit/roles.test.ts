import { describe, expect, it } from 'vitest'
import { NO_ROLES, canSee, homeFor, sidesOf } from '#/auth/roles'
import { describeShopProblems } from '#/auth/shop'
import type { Roles } from '#/auth/roles'

const shopkeeper: Roles = {
  merchant: { id: 'shop-1', name: 'بقالة الريان' },
  customer: false,
}
const customer: Roles = { merchant: null, customer: true }
const both: Roles = { ...shopkeeper, customer: true }

describe('where a person lands', () => {
  it('opens a shopkeeper on the shop, which is the side they use all day', () => {
    expect(homeFor(shopkeeper)).toBe('/merchant')
    expect(homeFor(both)).toBe('/merchant')
  })

  it('opens a customer on what they owe', () => {
    expect(homeFor(customer)).toBe('/customer')
  })

  it('sends a person on neither side to the screen that explains it', () => {
    expect(homeFor(NO_ROLES)).toBe('/welcome')
  })
})

describe('what a person may see', () => {
  it('keeps each side to the people on it', () => {
    expect(canSee(shopkeeper, 'merchant')).toBe(true)
    expect(canSee(shopkeeper, 'customer')).toBe(false)
    expect(canSee(customer, 'customer')).toBe(true)
    expect(canSee(customer, 'merchant')).toBe(false)
  })

  it('lets the person who is both see both', () => {
    expect(sidesOf(both)).toEqual(['merchant', 'customer'])
  })

  it('shows a person on neither side nothing', () => {
    expect(sidesOf(NO_ROLES)).toEqual([])
  })
})

describe('opening a shop', () => {
  const good = {
    name: 'بقالة الريان',
    defaultLimitRiyals: 1000,
    defaultTermDays: 30,
  }

  it('accepts a shop with a name, a limit and a term', () => {
    expect(describeShopProblems(good)).toEqual([])
  })

  it.each([
    [{ ...good, name: ' ' }, 'name'],
    [{ ...good, defaultLimitRiyals: 0 }, 'limit'],
    [{ ...good, defaultLimitRiyals: 200_000 }, 'limit'],
    [{ ...good, defaultLimitRiyals: 12.5 }, 'limit'],
    [{ ...good, defaultTermDays: 0 }, 'term'],
    [{ ...good, defaultTermDays: 400 }, 'term'],
  ])('refuses %j for its %s', (shop, problem) => {
    expect(describeShopProblems(shop)).toEqual([problem])
  })

  it('reports everything wrong at once', () => {
    expect(
      describeShopProblems({
        name: '',
        defaultLimitRiyals: -1,
        defaultTermDays: 0,
      }),
    ).toEqual(['name', 'limit', 'term'])
  })
})
