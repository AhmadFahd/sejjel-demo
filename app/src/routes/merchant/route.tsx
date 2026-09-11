import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { Dock } from '#/components/dock'
import { LedgerStream } from '#/components/ledger-stream'
import { useI18n } from '#/i18n/context'

/**
 * Everything on the shop's side of the ledger, with the event stream open
 * behind it: a purchase the customer approves on their phone reaches this one
 * without anybody pulling to refresh.
 */
export const Route = createFileRoute('/merchant')({ component: MerchantSide })

function MerchantSide() {
  const { t } = useI18n()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  // Opening a shop happens on this side of the tree but before there is a
  // shop, so the dock would point at screens its reader is sent back from.
  const opening = pathname === '/merchant/new'

  return (
    <>
      <LedgerStream enabled />
      <Outlet />
      {opening ? null : (
        <Dock
          items={[
            { to: '/merchant', label: t('nav.shop'), glyph: '▤' },
            { to: '/merchant/record', label: t('nav.record'), glyph: '+' },
            { to: '/merchant/scan', label: t('nav.scan'), glyph: '⌗' },
          ]}
        />
      )}
    </>
  )
}
