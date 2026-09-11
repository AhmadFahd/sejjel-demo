import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSide } from '#/auth/guard'
import { saveShopDefaults } from '#/auth/terms'
import { halalasToRiyals } from '#/lib/money'
import { AppBar, Button } from '#/components/chrome'
import { Card } from '#/components/primitives'
import { NumberField, TermChangeList, TermsProblems } from '#/components/terms'
import { useI18n } from '#/i18n/context'
import type { TermsAnswer } from '#/auth/terms'

const loadDefaults = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireSignedInUser } = await import('#/auth/session.server')
  const { getDatabase } = await import('#/db/client')
  const { listTermChanges, readShopTerms } = await import('#/db/queries/terms')
  const user = await requireSignedInUser()
  const shop = user.roles.merchant
  if (!shop) return null

  const db = getDatabase()
  const [terms, history] = await Promise.all([
    readShopTerms(db, shop.id),
    listTermChanges(db, { merchantId: shop.id }),
  ])
  return terms ? { terms, history } : null
})

/** UC-13: the figures every customer of this shop stands on. */
export const Route = createFileRoute('/merchant/settings')({
  beforeLoad: () => requireSide('merchant'),
  loader: () => loadDefaults(),
  component: ShopSettings,
})

function ShopSettings() {
  const data = Route.useLoaderData()
  const { t, list } = useI18n()
  const router = useRouter()
  const [limit, setLimit] = useState(
    data ? String(halalasToRiyals(data.terms.defaultLimitHalalas)) : '',
  )
  const [term, setTerm] = useState(
    data ? String(data.terms.defaultTermDays) : '',
  )
  const [answer, setAnswer] = useState<TermsAnswer | null>(null)
  const [busy, setBusy] = useState(false)

  if (!data) return null

  const save = async () => {
    setBusy(true)
    const result = await saveShopDefaults({
      data: { limitRiyals: Number(limit), termDays: Number(term) },
    })
    setBusy(false)
    setAnswer(result)
    if (result.problems.length === 0) await router.invalidate()
  }

  const saved = answer !== null && answer.problems.length === 0

  return (
    <>
      <AppBar />
      <main className="p-3.5">
        <Link
          to="/merchant"
          className="mb-3 inline-block text-[13px] font-black text-steel"
        >
          {t('nav.back')}
        </Link>
        <h1 className="mb-3 text-xl font-black text-ink">
          {t('settings.title')}
        </h1>

        <Card>
          <NumberField
            id="default-limit"
            label={t('shop.defaultLimit')}
            value={limit}
            onChange={setLimit}
          />
          <NumberField
            id="default-term"
            label={t('shop.defaultTerm')}
            value={term}
            onChange={setTerm}
            className="mt-3"
          />

          <p className="mt-2 mb-4 text-[11px] font-bold text-muted">
            {t('settings.defaultsNote')}
          </p>

          <Button
            tone="primary"
            disabled={busy}
            onClick={save}
            data-testid="save-defaults"
          >
            {t('settings.save')}
          </Button>

          {saved ? (
            <p
              role="status"
              className="mt-3 text-[12.5px] font-extrabold text-good-text"
              data-testid="defaults-saved"
            >
              {t('settings.saved')}{' '}
              {answer.moved > 0
                ? t('settings.moved', { count: String(answer.moved) })
                : t('settings.movedNone')}
            </p>
          ) : null}

          {/* Lowering a limit under what somebody already owes is allowed, so
              the shop is told who it left stuck rather than stopped. */}
          {saved && answer.overLimit.length > 0 ? (
            <p
              role="alert"
              className="mt-2 text-[12.5px] font-extrabold text-bad-text"
              data-testid="over-limit"
            >
              {t('settings.overLimit', {
                names: list(answer.overLimit.map((row) => row.customerName)),
              })}
            </p>
          ) : null}

          <TermsProblems problems={answer?.problems ?? []} />
        </Card>

        <h2 className="mt-4 mb-2 text-[13px] font-black text-muted">
          {t('settings.historyTitle')}
        </h2>
        <TermChangeList changes={data.history} />
      </main>
    </>
  )
}
