import { createServerFn } from '@tanstack/react-start'
import { describeOverrideProblems, describeTermsProblems } from '#/lib/terms'
import { riyalsToHalalas } from '#/lib/money'
import type { OverLimit } from '#/db/queries/terms'
import type { TermsProblem } from '#/lib/terms'

export type TermsAnswer = {
  problems: Array<TermsProblem | 'shop' | 'connection'>
  overLimit: Array<OverLimit>
  moved: number
}

const refused = (
  problems: Array<TermsProblem | 'shop' | 'connection'>,
): TermsAnswer => ({ problems, overLimit: [], moved: 0 })

/**
 * UC-13: the shop's defaults. Which shop is the session's, never the form's,
 * so nobody sets the terms of a shop that is not theirs.
 */
export const saveShopDefaults = createServerFn({ method: 'POST' })
  .validator((input: unknown): { limitRiyals: number; termDays: number } => {
    const raw = input as { limitRiyals?: unknown; termDays?: unknown }
    return {
      limitRiyals: Number(raw.limitRiyals),
      termDays: Number(raw.termDays),
    }
  })
  .handler(async ({ data }): Promise<TermsAnswer> => {
    const problems = describeTermsProblems({
      limitRiyals: data.limitRiyals,
      termDays: data.termDays,
    })
    if (problems.length > 0) return refused(problems)

    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { saveShopTerms } = await import('#/db/queries/terms')
    const user = await requireSignedInUser()
    const shop = user.roles.merchant
    if (!shop) return refused(['shop'])

    const result = await saveShopTerms(getDatabase(), {
      merchantId: shop.id,
      changedByUserId: user.id,
      limitHalalas: riyalsToHalalas(data.limitRiyals),
      termDays: data.termDays,
    })
    if (!result) return refused(['shop'])

    return { problems: [], ...result }
  })

export type CustomerOverrides = {
  connectionId: string
  /** Null clears the field, putting the customer back on the shop's default. */
  limitRiyals: number | null
  termDays: number | null
}

export const saveCustomerOverrides = createServerFn({ method: 'POST' })
  .validator((input: unknown): CustomerOverrides => {
    const raw = input as Partial<Record<keyof CustomerOverrides, unknown>>
    return {
      connectionId: String(raw.connectionId ?? ''),
      limitRiyals: raw.limitRiyals === null ? null : Number(raw.limitRiyals),
      termDays: raw.termDays === null ? null : Number(raw.termDays),
    }
  })
  .handler(async ({ data }): Promise<TermsAnswer> => {
    const problems = describeOverrideProblems({
      limitRiyals: data.limitRiyals,
      termDays: data.termDays,
    })
    if (problems.length > 0) return refused(problems)

    const { requireSignedInUser } = await import('./session.server')
    const { getDatabase } = await import('#/db/client')
    const { saveCustomerTerms } = await import('#/db/queries/terms')
    const user = await requireSignedInUser()
    const shop = user.roles.merchant
    if (!shop) return refused(['shop'])

    const result = await saveCustomerTerms(getDatabase(), {
      connectionId: data.connectionId,
      merchantId: shop.id,
      changedByUserId: user.id,
      limitOverrideHalalas:
        data.limitRiyals === null ? null : riyalsToHalalas(data.limitRiyals),
      termOverrideDays: data.termDays,
    })
    if (!result) return refused(['connection'])

    return { problems: [], ...result }
  })
