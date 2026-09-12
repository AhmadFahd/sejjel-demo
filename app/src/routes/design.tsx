import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Avatar,
  Card,
  KeyValueRow,
  MobileNumber,
  StatTile,
  StatusPill,
} from '#/components/primitives'
import {
  BalanceHero,
  LimitBar,
  OperationsCounter,
  PaydayStrip,
  TransactionRow,
} from '#/components/ledger'
import { BottomNav, Button, Sheet, Toast, useToast } from '#/components/chrome'
import { CodeBoxes } from '#/components/code-boxes'
import { Loading, LoadingDots } from '#/components/loading'
import { I18nProvider, useI18n } from '#/i18n/context'
import { LOCALES, directionOf } from '#/i18n/locales'
import {
  SAMPLE_CUSTOMERS,
  SAMPLE_NEXT_PAYDAY,
  SAMPLE_TRANSACTIONS,
} from '#/dev/sample-ledger'
import type { Locale } from '#/i18n/locales'

/**
 * Every shared component, in both languages and both directions, on one page.
 * It exists to be looked at while a screen is being built.
 */
export const Route = createFileRoute('/design')({ component: Gallery })

function Gallery() {
  return (
    <div className="grid gap-6 p-4 lg:grid-cols-2">
      {LOCALES.map((locale) => (
        <div key={locale} dir={directionOf(locale)}>
          <I18nProvider locale={locale}>
            <Panel locale={locale} />
          </I18nProvider>
        </div>
      ))}
    </div>
  )
}

function Panel({ locale }: { locale: Locale }) {
  const { t, money, date, time } = useI18n()
  const toast = useToast()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [code, setCode] = useState('')
  const [customer] = SAMPLE_CUSTOMERS

  return (
    <section
      className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[34px] bg-bone shadow-xl"
      data-testid={`gallery-${locale}`}
      data-dir={directionOf(locale)}
    >
      <div className="p-3.5">
        <div className="mb-3 grid grid-cols-3 gap-2.5">
          <StatTile label={t('ledger.customers')} value="3" />
          <StatTile
            label={t('ledger.outstanding')}
            value={money(customer.balanceHalalas)}
            tone="brand"
          />
          <StatTile
            label={t('ledger.overdueTotal')}
            value={money(SAMPLE_CUSTOMERS[2].balanceHalalas)}
            tone="bad"
            marked
          />
        </div>

        <Card className="p-0">
          <div className="p-4">
            <PaydayStrip nextPaydayAt={SAMPLE_NEXT_PAYDAY} />
          </div>
        </Card>

        <OperationsCounter purchases={12} payments={7} />

        {SAMPLE_CUSTOMERS.map((row, index) => (
          <Card key={row.name}>
            <div className="mb-3 flex items-center gap-2.5">
              <Avatar name={row.name} index={index} />
              <div className="flex-1">
                <div className="text-[15px] font-black text-ink">
                  {row.name}
                </div>
                <MobileNumber>{row.mobile}</MobileNumber>
              </div>
              <StatusPill status={row.status} />
            </div>
            <KeyValueRow
              label={t('ledger.balance')}
              emphasis
              tone={row.status === 'overdue' ? 'bad' : 'plain'}
            >
              {money(row.balanceHalalas)}
            </KeyValueRow>
            <KeyValueRow label={t('ledger.dueDate')}>
              {row.dueAt ? date(row.dueAt) : t('ledger.noDueDate')}
            </KeyValueRow>
            <LimitBar
              usedHalalas={row.balanceHalalas}
              limitHalalas={row.limitHalalas}
            />
          </Card>
        ))}

        <BalanceHero
          title={customer.name}
          subtitle={
            <span dir="ltr" className="text-[11.5px] font-bold text-white/70">
              {customer.mobile}
            </span>
          }
          status={customer.status}
          balanceHalalas={customer.balanceHalalas}
          facts={[
            {
              label: t('ledger.creditLimit'),
              value: money(customer.limitHalalas),
            },
            {
              label: t('ledger.available'),
              value: money(customer.limitHalalas - customer.balanceHalalas),
            },
            {
              label: t('ledger.dueDate'),
              value: customer.dueAt
                ? date(customer.dueAt)
                : t('ledger.noDueDate'),
            },
          ]}
        >
          <div className="relative z-1 mt-3">
            <PaydayStrip nextPaydayAt={SAMPLE_NEXT_PAYDAY} onDark />
            <LimitBar
              usedHalalas={customer.balanceHalalas}
              limitHalalas={customer.limitHalalas}
              onDark
            />
          </div>
        </BalanceHero>

        {/* UC-18: the four fills, so the thresholds can be looked at together
            rather than hunted for on an account that happens to be there. */}
        <Card>
          {[40, 70, 90, 120].map((spent) => (
            <LimitBar
              key={spent}
              usedHalalas={spent * 1000}
              limitHalalas={100 * 1000}
            />
          ))}
        </Card>

        <Card>
          {SAMPLE_TRANSACTIONS.map((entry) => (
            <TransactionRow
              key={entry.at.toISOString()}
              kind={entry.kind}
              title={
                entry.kind === 'purchase'
                  ? t('ledger.purchases')
                  : t('ledger.payments')
              }
              when={`${date(entry.at)} · ${time(entry.at)}`}
              amountHalalas={entry.amountHalalas}
            />
          ))}
        </Card>

        <Card>
          <p className="mb-2 text-[12.5px] font-bold text-muted">
            {t('auth.codeLabel')}
          </p>
          <CodeBoxes code={code} onCode={setCode} />
        </Card>

        {/* #75: the loader every screen shows while it waits, and the dots
            for the places where only a part of one is waiting. */}
        <Card className="p-0">
          <Loading rows={1} />
        </Card>
        <Card>
          <p className="text-[13px] font-bold text-muted">
            {t('loading')} <LoadingDots />
          </p>
        </Card>

        <div className="grid gap-2.5">
          <Button tone="primary" onClick={() => toast.show(t('appTagline'))}>
            {t('ledger.operations')}
          </Button>
          <div className="flex gap-2.5">
            {/* The bone tone only ever sits on the green, so the gallery shows
                it there rather than on a ground it disappears into. */}
            <div className="flex-1 rounded-(--radius-control) bg-brand p-2">
              <Button tone="bone" onClick={() => setSheetOpen(true)}>
                {t('ledger.creditLimit')}
              </Button>
            </div>
            <Button tone="ghost">{t('ledger.available')}</Button>
          </div>
          <div className="flex gap-2.5">
            <Button tone="pay">{t('ledger.payments')}</Button>
            <Button tone="danger">{t('status.overdue')}</Button>
          </div>
        </div>
      </div>

      <BottomNav
        activeId="home"
        items={[
          { id: 'home', label: t('ledger.balance'), icon: <DotIcon /> },
          {
            id: 'operations',
            label: t('ledger.operations'),
            icon: <DotIcon />,
            badge: 3,
          },
          { id: 'customers', label: t('ledger.customers'), icon: <DotIcon /> },
        ]}
      />

      <Toast
        message={toast.message}
        open={toast.open}
        onDismiss={toast.dismiss}
      />
      <Sheet
        open={sheetOpen}
        title={t('ledger.creditLimit')}
        onClose={() => setSheetOpen(false)}
      >
        <p className="mb-3 text-[13px] font-bold text-muted">
          {t('payday.note')}
        </p>
        <Button tone="soft" onClick={() => setSheetOpen(false)}>
          {t('locale.label')}
        </Button>
      </Sheet>
    </section>
  )
}

function DotIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
    >
      <circle cx="12" cy="12" r="8" />
    </svg>
  )
}
