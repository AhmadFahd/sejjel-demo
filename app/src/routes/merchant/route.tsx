import { Outlet, createFileRoute } from '@tanstack/react-router'
import { LedgerStream } from '#/components/ledger-stream'

/**
 * Everything on the shop's side of the ledger, with the event stream open
 * behind it: a purchase the customer approves on their phone reaches this one
 * without anybody pulling to refresh.
 */
export const Route = createFileRoute('/merchant')({ component: MerchantSide })

function MerchantSide() {
  return (
    <>
      <LedgerStream enabled />
      <Outlet />
    </>
  )
}
