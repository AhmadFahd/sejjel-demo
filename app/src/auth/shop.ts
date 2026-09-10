import { createServerFn } from '@tanstack/react-start'
import { riyalsToHalalas } from '#/lib/money'

export type NewShop = {
  name: string
  defaultLimitRiyals: number
  defaultTermDays: number
}

/** What a shop cannot be opened without, and what it cannot be opened with. */
export function describeShopProblems(shop: NewShop): Array<string> {
  const problems: Array<string> = []

  if (shop.name.trim().length < 2) problems.push('name')
  if (
    !Number.isInteger(shop.defaultLimitRiyals) ||
    shop.defaultLimitRiyals <= 0 ||
    shop.defaultLimitRiyals > 100_000
  ) {
    problems.push('limit')
  }
  if (
    !Number.isInteger(shop.defaultTermDays) ||
    shop.defaultTermDays < 1 ||
    shop.defaultTermDays > 90
  ) {
    problems.push('term')
  }

  return problems
}

export const registerShop = createServerFn({ method: 'POST' })
  .validator((input: unknown): NewShop => {
    const raw = input as Partial<Record<keyof NewShop, unknown>>
    return {
      name: String(raw.name ?? ''),
      defaultLimitRiyals: Number(raw.defaultLimitRiyals),
      defaultTermDays: Number(raw.defaultTermDays),
    }
  })
  .handler(async ({ data }) => {
    const problems = describeShopProblems(data)
    if (problems.length > 0) return { problems }

    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { merchants } = await import('#/db/schema')
    const user = await requireSignedInUser()

    if (user.roles.merchant) return { problems: ['already'] }

    await getDatabase()
      .insert(merchants)
      .values({
        ownerUserId: user.id,
        name: data.name.trim(),
        defaultLimitHalalas: riyalsToHalalas(data.defaultLimitRiyals),
        defaultTermDays: data.defaultTermDays,
      })

    return { problems: [] }
  })
