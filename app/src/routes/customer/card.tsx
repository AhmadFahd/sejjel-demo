import { useCallback, useEffect, useState } from 'react'
import { Await, Link, createFileRoute } from '@tanstack/react-router'
import { mintMyCode, myConnectionRequests } from '#/auth/connect'
import { Card } from '#/components/primitives'
import { ApprovalCode } from '#/components/approval-code'
import { ConnectionRequests } from '#/components/connection-requests'
import { useI18n } from '#/i18n/context'
import { WATCHED } from '#/lib/freshness'

/**
 * UC-08: the customer's own card. A shop scans it to ask for them, so it says
 * who they are and nothing else, and it runs out like any other code: a photo
 * of this screen is worth nothing two minutes later.
 */
export const Route = createFileRoute('/customer/card')({
  // Anybody signed in: a person no shop has connected yet is exactly who
  // needs a card to be scanned.
  //
  // #81: nothing here is awaited, so the card is on the glass on the tap that
  // asked for it and the shops asking for this person arrive on it after. The
  // code is not here at all — the screen asks for that itself, because this
  // loader runs again on every stream event and a shop asking for this person
  // is one of them.
  loader: () => ({ requests: myConnectionRequests() }),
  // #80: what this loader reads is a list somebody else adds to, and the
  // stream says when they have.
  ...WATCHED,
  component: MyCard,
})

function MyCard() {
  const { requests } = Route.useLoaderData()
  const { t } = useI18n()
  const [code, setCode] = useState<string | null>(null)
  const [issuedAt, setIssuedAt] = useState(0)
  const [waiting, setWaiting] = useState(true)

  /**
   * #81: the code belongs to the screen, not to the route. A shop halfway
   * through scanning the card is holding a phone whose route is being reloaded
   * — its own request is what reloads it — and the QR it is reading must not
   * change underneath it. So the only two things that ever replace this code
   * are the button below and its own two minutes running out.
   */
  const fresh = useCallback(async () => {
    setWaiting(true)
    try {
      const next = await mintMyCode()
      setCode(next.code)
      setIssuedAt(Date.now())
    } finally {
      setWaiting(false)
    }
  }, [])

  useEffect(() => {
    void fresh().catch(() => {
      // Said on the screen by `ApprovalCode`, which offers the button again.
    })
  }, [fresh])

  // #76: the shop scans this screen, so the answer has to arrive on it, and
  // the stream that brings it is the one the side's layout holds open above
  // here. Mounting a second one meant two connections and every event
  // delivered twice.
  return (
    <main className="p-3.5">
      <Link
        to="/"
        className="mb-3 inline-block text-[13px] font-black text-brand"
      >
        {t('nav.back')}
      </Link>
      <h1 className="mb-3 text-xl font-black text-ink">{t('card.title')}</h1>

      {/* Nothing stands in for this list while it is on its way: there is
          usually nothing in it, and a shop asking is news rather than
          something the reader came here to wait for. An empty fragment
          rather than `null`, because `Await` only puts a boundary around
          itself when it is given a fallback — and without one the wait for
          this list would take the card down with it. */}
      <Await promise={requests} fallback={<></>}>
        {(waitingOn) => <ConnectionRequests requests={waitingOn} />}
      </Await>

      <Card data-testid="my-card">
        <p className="mb-3 text-[13px] font-bold text-muted">
          {t('card.body')}
        </p>
        <ApprovalCode
          code={code}
          issuedAt={issuedAt}
          waiting={waiting}
          onRegenerate={fresh}
        />
      </Card>
    </main>
  )
}
