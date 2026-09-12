import {
  createFileRoute,
  notFound,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { loadSignedInUser } from '#/auth/session'
import { joinShopFn } from '#/auth/join'
import { Button } from '#/components/chrome'
import { Card, KeyValueRow } from '#/components/primitives'
import { useI18n } from '#/i18n/context'

const loadShop = createServerFn({ method: 'GET' })
  .validator((input: unknown): { merchantId: string } => ({
    merchantId: String((input as { merchantId?: unknown }).merchantId ?? ''),
  }))
  .handler(async ({ data }) => {
    const { readSignedInUser } = await import('#/auth/session.server')
    const { getDatabase } = await import('#/db/client')
    const { readShopFor } = await import('#/db/queries/join')
    const user = await readSignedInUser()

    return readShopFor(getDatabase(), {
      merchantId: data.merchantId,
      userId: user?.id ?? null,
    })
  })

/**
 * UC-16: what the code on the shop's counter leads to. The code says which
 * shop and nothing else — no session, nothing secret, and it does not run
 * out, so it can be printed and left there.
 */
export const Route = createFileRoute('/shop/$merchantId')({
  beforeLoad: async ({ params }) => {
    const user = await loadSignedInUser()
    // Signed out, this is where they were going: back here once they are in.
    if (!user) {
      throw redirect({
        to: '/sign-in',
        search: { next: `/shop/${params.merchantId}` },
      })
    }
  },
  loader: async ({ params }) => {
    const shop = await loadShop({ data: { merchantId: params.merchantId } })
    if (!shop) throw notFound()
    // Somebody the shop already keeps goes straight to their account with it,
    // which is where an operation with that shop happens for them.
    if (shop.connectionId) {
      throw redirect({
        to: '/customer/$connectionId',
        params: { connectionId: shop.connectionId },
      })
    }
    return shop
  },
  component: ShopCounter,
})

function ShopCounter() {
  const shop = Route.useLoaderData()
  const { t, money, number } = useI18n()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const join = async () => {
    setBusy(true)
    const result = await joinShopFn({ data: { merchantId: shop.merchantId } })
    setBusy(false)

    if (!result.connectionId) {
      setProblem(result.problem)
      return
    }

    await router.invalidate()
    await router.navigate({
      to: '/customer/$connectionId',
      params: { connectionId: result.connectionId },
    })
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-10">
      <h1 className="mb-1 text-2xl font-black text-ink">{shop.name}</h1>
      <p className="mb-4 text-[13px] font-bold text-muted">
        {t('shop.joinBody')}
      </p>

      <Card data-testid="join-shop">
        <KeyValueRow label={t('ledger.creditLimit')} emphasis>
          {money(shop.limitHalalas)}
        </KeyValueRow>
        <KeyValueRow label={t('shop.defaultTerm')}>
          {number(shop.termDays)}
        </KeyValueRow>

        <p className="mt-3 mb-4 text-[12px] font-bold text-muted">
          {t('request.terms', {
            limit: money(shop.limitHalalas),
            days: number(shop.termDays),
          })}
        </p>

        <Button
          tone="primary"
          disabled={busy}
          onClick={join}
          data-testid="join"
        >
          {t('shop.join')}
        </Button>

        {problem ? (
          <p
            role="alert"
            className="mt-3 text-[12.5px] font-extrabold text-bad-text"
          >
            {t(problem === 'self' ? 'shop.error.own' : 'notFound.body')}
          </p>
        ) : null}
      </Card>
    </main>
  )
}
