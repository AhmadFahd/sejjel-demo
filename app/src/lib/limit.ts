/**
 * UC-18: how full a customer's credit limit is, and what that means. The
 * thresholds are the prototype's — 60%, 85%, and full — and they live here
 * rather than in the component so the rule can be read and tested on its own.
 */

export type LimitLevel = 'ok' | 'warm' | 'hot' | 'full'

export const WARM_PERCENT = 60
export const HOT_PERCENT = 85

export type LimitUse = {
  percent: number
  remainingHalalas: number
  level: LimitLevel
}

/**
 * Nothing at all for a connection with no limit: there is no share of zero to
 * draw, and a bar with an undefined fill is worse than no bar.
 *
 * A balance past the limit reads as full rather than as more than full, and
 * the remainder stops at nothing rather than going negative.
 */
export function limitUse(
  usedHalalas: number,
  limitHalalas: number,
): LimitUse | null {
  if (limitHalalas <= 0) return null

  const percent = Math.min(
    100,
    Math.max(0, Math.round((usedHalalas / limitHalalas) * 100)),
  )

  return {
    percent,
    remainingHalalas: Math.max(0, limitHalalas - usedHalalas),
    level:
      percent >= 100
        ? 'full'
        : percent >= HOT_PERCENT
          ? 'hot'
          : percent >= WARM_PERCENT
            ? 'warm'
            : 'ok',
  }
}
