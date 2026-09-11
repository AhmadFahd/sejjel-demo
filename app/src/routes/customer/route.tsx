import { Outlet, createFileRoute } from '@tanstack/react-router'
import { Dock } from '#/components/dock'
import { LedgerStream } from '#/components/ledger-stream'
import { useI18n } from '#/i18n/context'

/** The customer's side, with the same stream open behind it. */
export const Route = createFileRoute('/customer')({ component: CustomerSide })

function CustomerSide() {
  const { t } = useI18n()

  return (
    <>
      <LedgerStream enabled />
      <Outlet />
      <Dock
        items={[
          { to: '/customer', label: t('nav.ledger'), glyph: '▤' },
          { to: '/customer/card', label: t('nav.card'), glyph: '◧' },
        ]}
      />
    </>
  )
}
