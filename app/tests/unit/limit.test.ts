import { describe, expect, it } from 'vitest'
import { limitUse } from '#/lib/limit'
import { riyalsToHalalas } from '#/lib/money'

const use = (usedRiyals: number, limitRiyals: number) =>
  limitUse(riyalsToHalalas(usedRiyals), riyalsToHalalas(limitRiyals))

describe('limitUse', () => {
  it('is nothing at all where there is no limit to fill', () => {
    expect(use(0, 0)).toBeNull()
    expect(limitUse(riyalsToHalalas(100), -1)).toBeNull()
  })

  it('reads the share of the limit that is spent, and what is left', () => {
    expect(use(250, 1000)).toMatchObject({
      percent: 25,
      remainingHalalas: riyalsToHalalas(750),
      level: 'ok',
    })
  })

  /** The prototype's thresholds, checked on the figure either side of each. */
  it('changes at 60, at 85, and at full', () => {
    expect(use(590, 1000)?.level).toBe('ok')
    expect(use(600, 1000)?.level).toBe('warm')
    expect(use(840, 1000)?.level).toBe('warm')
    expect(use(850, 1000)?.level).toBe('hot')
    expect(use(990, 1000)?.level).toBe('hot')
    expect(use(1000, 1000)?.level).toBe('full')
  })

  /**
   * The level follows the percent that is shown, not the exact share: a bar
   * labelled 60% and coloured as if it were 59 would read as a mistake.
   */
  it('turns on the figure it displays', () => {
    expect(use(599, 1000)).toMatchObject({ percent: 60, level: 'warm' })
    expect(use(594, 1000)).toMatchObject({ percent: 59, level: 'ok' })
    expect(use(999, 1000)).toMatchObject({ percent: 100, level: 'full' })
  })

  it('stops at full for a balance past the limit, and leaves nothing over', () => {
    const over = use(1500, 1000)
    expect(over?.percent).toBe(100)
    expect(over?.remainingHalalas).toBe(0)
    expect(over?.level).toBe('full')
  })

  it('draws nothing for a settled account rather than a sliver', () => {
    expect(use(0, 1000)).toMatchObject({ percent: 0, level: 'ok' })
  })

  /** A payment past the balance would otherwise draw a bar running backwards. */
  it('holds at nothing for a balance in the customer’s favour', () => {
    expect(use(-200, 1000)?.percent).toBe(0)
  })
})
