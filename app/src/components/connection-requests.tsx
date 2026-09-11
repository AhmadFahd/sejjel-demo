import { useRouter } from '@tanstack/react-router'
import { answerRequest } from '#/auth/connect'
import { Button } from './chrome'
import { Card } from './primitives'
import { useI18n } from '#/i18n/context'
import type { ConnectionRequest } from '#/db/queries/connect'

/**
 * UC-08: the shops asking to keep this person, and their answer. It sits on
 * the customer's dashboard and on the welcome screen, because the person a
 * shop asks for first is often on neither side of the ledger yet.
 */
export function ConnectionRequests({
  requests,
}: {
  requests: Array<ConnectionRequest>
}) {
  const { t, money, number } = useI18n()
  const router = useRouter()

  const answer = async (connectionId: string, agree: boolean) => {
    await answerRequest({ data: { connectionId, agree } })
    await router.invalidate()
    // Agreeing makes them a customer of that shop, so the ledger is where
    // they should be standing afterwards.
    if (agree) await router.navigate({ to: '/customer' })
  }

  return (
    <>
      {requests.map((request) => (
        <Card key={request.connectionId} data-testid="connection-request">
          <h2 className="mb-1 text-base font-black text-ink">
            {t('request.title')}
          </h2>
          <div className="mb-1 text-[15px] font-black text-ink">
            {request.merchantName}
          </div>
          <p className="mb-3 text-[13px] font-bold text-muted">
            {t('request.terms', {
              limit: money(request.limitHalalas),
              days: number(request.termDays),
            })}
          </p>
          <div className="grid gap-2">
            <Button
              tone="primary"
              onClick={() => void answer(request.connectionId, true)}
            >
              {t('request.agree')}
            </Button>
            <Button
              tone="ghost"
              onClick={() => void answer(request.connectionId, false)}
            >
              {t('request.refuse')}
            </Button>
          </div>
        </Card>
      ))}
    </>
  )
}
