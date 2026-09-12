import { Link, createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSideOf } from '#/auth/enter'
import { QrCanvas } from '#/components/qr-canvas'
import { useI18n } from '#/i18n/context'

const loadShopCode = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSignedInUser } = await import('#/auth/session.server')
  const user = await requireSignedInUser()
  const shop = user.roles.merchant
  return shop ? { id: shop.id, name: shop.name } : null
})

/**
 * A URL rather than a token of our own: a phone's own camera opens it, there
 * is nothing in it but which shop — no session, nothing secret — and it does
 * not run out, so it can be printed and left on the counter.
 */
export function shopUrl(merchantId: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}/shop/${merchantId}`
}

/** UC-16: the shop's code, big enough to scan from arm's length. */
export const Route = createFileRoute('/merchant/qr')({
  beforeLoad: ({ context }) => requireSideOf(context.person, 'merchant'),
  loader: () => loadShopCode(),
  component: ShopCode,
})

function ShopCode() {
  const data = Route.useLoaderData()
  const { t } = useI18n()
  if (!data) return null

  const url = shopUrl(data.id)

  return (
    <main className="p-3.5">
      <Link
        to="/merchant"
        className="mb-3 inline-block text-[13px] font-black text-steel print:hidden"
      >
        {t('nav.back')}
      </Link>

      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 rounded-(--radius-card) bg-card p-6 text-center shadow-(--shadow-card)">
        <h1 className="text-xl font-black text-ink">{data.name}</h1>
        <QrCanvas value={url} size={420} testId="shop-qr-full" />
        <p className="text-[12.5px] font-bold text-muted">
          {t('shop.counterBody')}
        </p>
        <span dir="ltr" className="text-[11px] font-bold break-all text-steel">
          {url}
        </span>
      </div>
    </main>
  )
}
