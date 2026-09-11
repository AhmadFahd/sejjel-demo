import { Outlet, createFileRoute } from '@tanstack/react-router'
import { LedgerStream } from '#/components/ledger-stream'

/** The customer's side, with the same stream open behind it. */
export const Route = createFileRoute('/customer')({ component: CustomerSide })

function CustomerSide() {
  return (
    <>
      <LedgerStream enabled />
      <Outlet />
    </>
  )
}
