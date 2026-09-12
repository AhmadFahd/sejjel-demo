import { createServerFn } from '@tanstack/react-start'

/**
 * UC-16: the customer joins the shop whose code they scanned. Which shop is
 * in the code; who is joining comes from the session, never from the form.
 */
export const joinShopFn = createServerFn({ method: 'POST' })
  .validator((input: unknown): { merchantId: string } => ({
    merchantId: String((input as { merchantId?: unknown }).merchantId ?? ''),
  }))
  .handler(
    async ({
      data,
    }): Promise<{ connectionId: string | null; problem: string | null }> => {
      const { requireSignedInUser } = await import('./session.server')
      const { getDatabase } = await import('#/db/client')
      const { joinShop } = await import('#/db/queries/join')
      const user = await requireSignedInUser()

      const result = await joinShop(getDatabase(), {
        merchantId: data.merchantId,
        userId: user.id,
      })

      return result.ok
        ? { connectionId: result.connectionId, problem: null }
        : { connectionId: null, problem: result.problem }
    },
  )
