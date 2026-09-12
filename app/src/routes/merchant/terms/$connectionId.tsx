import { useState } from 'react'
import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSide } from '#/auth/guard'
import { saveCustomerOverrides } from '#/auth/terms'
import { halalasToRiyals, riyalsToHalalas } from '#/lib/money'
import { isBelowBalance } from '#/lib/terms'
import { Button } from '#/components/chrome'
import { Card, KeyValueRow } from '#/components/primitives'
import { NumberField, TermChangeList, TermsProblems } from '#/components/terms'
import { useI18n } from '#/i18n/context'
import type { TermsAnswer } from '#/auth/terms'

const loadTerms = createServerFn({ method: 'GET' })
  .validator((input: unknown): { connectionId: string } => {
    const raw = input as { connectionId?: unknown }
    return { connectionId: String(raw.connectionId ?? '') }
  })
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('#/auth/session.server')
    const { getDatabase } = await import('#/db/client')
    const { getConnectionSummary } = await import('#/db/queries/ledger')
    const { listTermChanges } = await import('#/db/queries/terms')
    const user = await requireSignedInUser()
    const shop = user.roles.merchant
    if (!shop) return null

    const db = getDatabase()
    const summary = await getConnectionSummary(db, data.connectionId)
    if (!summary || summary.merchantId !== shop.id) return null

    return {
      summary,
      history: await listTermChanges(db, {
        merchantId: shop.id,
        connectionId: data.connectionId,
      }),
    }
  })

/** UC-13: what this one customer stands on, where it differs from the shop. */
export const Route = createFileRoute('/merchant/terms/$connectionId')({
  beforeLoad: () => requireSide('merchant'),
  loader: async ({ params }) => {
    const terms = await loadTerms({
      data: { connectionId: params.connectionId },
    })
    if (!terms) throw notFound()
    return terms
  },
  component: CustomerTerms,
})

function CustomerTerms() {
  const { summary, history } = Route.useLoaderData()
  const { t, money } = useI18n()
  const router = useRouter()

  // A field is either the customer's own figure or the shop's. The checkbox
  // is which of the two, and the input holds the figure only in the first
  // case — unchecked, it shows the default rather than a stale override.
  const [ownLimit, setOwnLimit] = useState(
    summary.limitOverrideHalalas !== null,
  )
  const [ownTerm, setOwnTerm] = useState(summary.termOverrideDays !== null)
  const [limit, setLimit] = useState(
    String(halalasToRiyals(summary.limitHalalas)),
  )
  const [term, setTerm] = useState(String(summary.termDays))
  const [answer, setAnswer] = useState<TermsAnswer | null>(null)
  const [busy, setBusy] = useState(false)

  const defaultLimitRiyals = halalasToRiyals(summary.defaultLimitHalalas)

  const save = async (overrides: {
    limitRiyals: number | null
    termDays: number | null
  }) => {
    setBusy(true)
    const result = await saveCustomerOverrides({
      data: { connectionId: summary.connectionId, ...overrides },
    })
    setBusy(false)
    setAnswer(result)
    if (result.problems.length === 0) await router.invalidate()
  }

  const clear = async () => {
    setOwnLimit(false)
    setOwnTerm(false)
    setLimit(String(defaultLimitRiyals))
    setTerm(String(summary.defaultTermDays))
    await save({ limitRiyals: null, termDays: null })
  }

  // The warning is live, before the save rather than after it: the shop sees
  // what a figure under the balance would mean while it is still typing.
  const typedLimitHalalas = ownLimit
    ? riyalsToHalalas(Number(limit))
    : summary.defaultLimitHalalas
  const wouldStick = isBelowBalance(typedLimitHalalas, summary.balanceHalalas)
  const saved = answer !== null && answer.problems.length === 0

  return (
    <>
      <main className="p-3.5">
        <Link
          to="/merchant/$connectionId"
          params={{ connectionId: summary.connectionId }}
          className="mb-3 inline-block text-[13px] font-black text-brand"
        >
          {t('nav.back')}
        </Link>
        <h1 className="mb-1 text-xl font-black text-ink">
          {t('settings.customerTitle', { name: summary.customerName })}
        </h1>
        <p className="mb-3 text-[12.5px] font-bold text-muted">
          {t('settings.customerNote')}
        </p>

        <Card>
          <KeyValueRow label={t('settings.balanceNow')} emphasis>
            {money(summary.balanceHalalas)}
          </KeyValueRow>

          <NumberField
            id="customer-limit"
            className="mt-3"
            label={t('ledger.creditLimit')}
            value={ownLimit ? limit : String(defaultLimitRiyals)}
            onChange={setLimit}
            disabled={!ownLimit}
            note={
              ownLimit
                ? undefined
                : t('settings.inherited', {
                    value: money(summary.defaultLimitHalalas),
                  })
            }
            action={
              <OwnFigureToggle
                id="own-limit"
                checked={ownLimit}
                onChange={(checked) => {
                  setOwnLimit(checked)
                  if (!checked) setLimit(String(defaultLimitRiyals))
                }}
              />
            }
          />

          <NumberField
            id="customer-term"
            className="mt-3"
            label={t('shop.defaultTerm')}
            value={ownTerm ? term : String(summary.defaultTermDays)}
            onChange={setTerm}
            disabled={!ownTerm}
            note={
              ownTerm
                ? undefined
                : t('settings.inheritedDays', {
                    days: String(summary.defaultTermDays),
                  })
            }
            action={
              <OwnFigureToggle
                id="own-term"
                checked={ownTerm}
                onChange={(checked) => {
                  setOwnTerm(checked)
                  if (!checked) setTerm(String(summary.defaultTermDays))
                }}
              />
            }
          />

          {wouldStick ? (
            <p
              role="alert"
              className="mt-3 text-[12.5px] font-bold text-bad-text"
              data-testid="below-balance"
            >
              {t('settings.belowBalance', {
                balance: money(summary.balanceHalalas),
              })}
            </p>
          ) : null}

          <Button
            tone="primary"
            className="mt-3"
            disabled={busy}
            data-testid="save-terms"
            onClick={() =>
              save({
                limitRiyals: ownLimit ? Number(limit) : null,
                termDays: ownTerm ? Number(term) : null,
              })
            }
          >
            {t('settings.save')}
          </Button>

          <Button
            tone="ghost"
            className="mt-2"
            disabled={busy}
            data-testid="reset-terms"
            onClick={clear}
          >
            {t('settings.reset')}
          </Button>

          {saved ? (
            <p
              role="status"
              className="mt-3 text-[12.5px] font-bold text-good-text"
              data-testid="terms-saved"
            >
              {t('settings.saved')}
            </p>
          ) : null}

          <TermsProblems problems={answer?.problems ?? []} />
        </Card>

        <h2 className="mt-4 mb-2 text-[13px] font-black text-muted">
          {t('settings.historyTitle')}
        </h2>
        <TermChangeList changes={history} />
      </main>
    </>
  )
}

function OwnFigureToggle({
  id,
  checked,
  onChange,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const { t } = useI18n()

  return (
    <label
      htmlFor={id}
      className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-brand"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {t('settings.ownFigure')}
    </label>
  )
}
