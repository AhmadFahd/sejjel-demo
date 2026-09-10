import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { requireSignedIn } from '#/auth/guard'
import { registerShop } from '#/auth/shop'
import { Button } from '#/components/chrome'
import { Card } from '#/components/primitives'
import { useI18n } from '#/i18n/context'

const DEFAULT_LIMIT_RIYALS = 1000
const DEFAULT_TERM_DAYS = 30

export const Route = createFileRoute('/merchant/new')({
  beforeLoad: () => requireSignedIn(),
  component: NewShop,
})

function NewShop() {
  const { t } = useI18n()
  const router = useRouter()
  const [name, setName] = useState('')
  const [limit, setLimit] = useState(String(DEFAULT_LIMIT_RIYALS))
  const [term, setTerm] = useState(String(DEFAULT_TERM_DAYS))
  const [problems, setProblems] = useState<Array<string>>([])
  const [busy, setBusy] = useState(false)

  const open = async () => {
    setBusy(true)
    const result = await registerShop({
      data: {
        name,
        defaultLimitRiyals: Number(limit),
        defaultTermDays: Number(term),
      },
    })
    setBusy(false)
    setProblems(result.problems)

    if (result.problems.length === 0) {
      await router.invalidate()
      await router.navigate({ to: '/merchant' })
    }
  }

  const field =
    'mb-1 w-full rounded-(--radius-control) border border-neutral-bg px-3 py-3 text-base'
  const label = 'mb-1 block text-[12.5px] font-extrabold text-muted'

  return (
    <main className="mx-auto max-w-sm px-6 py-10">
      <h1 className="mb-4 text-2xl font-black text-ink">
        {t('shop.newTitle')}
      </h1>

      <Card>
        <label className={label} htmlFor="shop-name">
          {t('shop.name')}
        </label>
        <input
          id="shop-name"
          className={field}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label className={`${label} mt-3`} htmlFor="shop-limit">
          {t('shop.defaultLimit')}
        </label>
        <input
          id="shop-limit"
          inputMode="numeric"
          dir="ltr"
          className={field}
          value={limit}
          onChange={(event) => setLimit(event.target.value.replace(/\D/g, ''))}
        />

        <label className={`${label} mt-3`} htmlFor="shop-term">
          {t('shop.defaultTerm')}
        </label>
        <input
          id="shop-term"
          inputMode="numeric"
          dir="ltr"
          className={field}
          value={term}
          onChange={(event) => setTerm(event.target.value.replace(/\D/g, ''))}
        />

        <p className="mt-2 mb-4 text-[11px] font-bold text-muted">
          {t('shop.defaultsNote')}
        </p>

        <Button tone="primary" disabled={busy} onClick={open}>
          {t('shop.open')}
        </Button>

        {problems.length > 0 ? (
          <ul role="alert" className="mt-4 space-y-1">
            {problems.map((problem) => (
              <li
                key={problem}
                className="text-[12.5px] font-extrabold text-bad-text"
              >
                {t(
                  `shop.error.${problem}` as
                    | 'shop.error.name'
                    | 'shop.error.limit'
                    | 'shop.error.term'
                    | 'shop.error.already',
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </main>
  )
}
