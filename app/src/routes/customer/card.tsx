import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { requireSignedIn } from '#/auth/guard'
import { issueMyCode } from '#/auth/connect'
import { Card } from '#/components/primitives'
import { ApprovalCode } from '#/components/approval-code'
import { ConnectionRequests } from '#/components/connection-requests'
import { LedgerStream } from '#/components/ledger-stream'
import { useI18n } from '#/i18n/context'

/**
 * UC-08: the customer's own card. A shop scans it to ask for them, so it says
 * who they are and nothing else, and it runs out like any other code: a photo
 * of this screen is worth nothing two minutes later.
 */
export const Route = createFileRoute('/customer/card')({
  // Anybody signed in: a person no shop has connected yet is exactly who
  // needs a card to be scanned.
  beforeLoad: () => requireSignedIn(),
  loader: () => issueMyCode(),
  component: MyCard,
})

function MyCard() {
  const first = Route.useLoaderData()
  const { t } = useI18n()
  const [code, setCode] = useState(first.code)
  const [issuedAt, setIssuedAt] = useState(() => Date.now())

  useEffect(() => {
    setCode(first.code)
    setIssuedAt(Date.now())
  }, [first.code])

  const fresh = async () => {
    const next = await issueMyCode()
    setCode(next.code)
    setIssuedAt(Date.now())
  }

  return (
    <>
      {/* The shop scans this screen, so the answer has to arrive on it. */}
      <LedgerStream enabled />
      <main className="p-3.5">
        <Link
          to="/"
          className="mb-3 inline-block text-[13px] font-black text-brand"
        >
          {t('nav.back')}
        </Link>
        <h1 className="mb-3 text-xl font-black text-ink">{t('card.title')}</h1>

        <ConnectionRequests requests={first.requests} />

        <Card data-testid="my-card">
          <p className="mb-3 text-[13px] font-bold text-muted">
            {t('card.body')}
          </p>
          <ApprovalCode code={code} issuedAt={issuedAt} onRegenerate={fresh} />
        </Card>
      </main>
    </>
  )
}
