import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PrototypeSwitcher } from '#/components/prototype-switcher'
import {
  Avatar,
  Card,
  KeyValueRow,
  MobileNumber,
  StatTile,
  StatusPill,
  cx,
} from '#/components/primitives'
import { OperationsCounter, PaydayStrip } from '#/components/ledger'
import { LocaleToggle } from '#/components/locale-toggle'
import { useI18n } from '#/i18n/context'
import { SAMPLE_CUSTOMERS, SAMPLE_NEXT_PAYDAY } from '#/dev/sample-ledger'
import type { ReactNode } from 'react'

/**
 * PROTOTYPE. Three answers to the same question: where navigation lives at a
 * phone's width and at a desktop's, switchable with `?variant=`. The screen
 * under the chrome is the shop's home, built from the gallery fixture so the
 * chrome is judged against real density rather than an empty page — and so it
 * opens without signing in.
 *
 * The variants disagree about structure, not colour:
 *   A — top navbar on desktop, a floating dock on a phone.
 *   B — a rail down the start edge on desktop, a flush bar with a raised
 *       action on a phone.
 *   C — one floating dock at every width: bottom on a phone, a detached pill
 *       at the top on desktop.
 */

const VARIANTS = [
  { key: 'A', name: 'Navbar + floating dock' },
  { key: 'B', name: 'Side rail + raised action' },
  { key: 'C', name: 'One dock, every width' },
] as const

type VariantKey = (typeof VARIANTS)[number]['key']

function isVariant(value: unknown): value is VariantKey {
  return VARIANTS.some((variant) => variant.key === value)
}

export const Route = createFileRoute('/prototype/shell')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { variant?: VariantKey } =>
    isVariant(search.variant) ? { variant: search.variant } : {},
  component: ShellPrototype,
})

/** What the nav offers. Not a route each — this screen goes nowhere. */
type Tab = 'home' | 'customers' | 'record' | 'payday' | 'account'

function useTabs() {
  const { locale } = useI18n()
  const label = LABELS[locale === 'ar' ? 'ar' : 'en']

  return [
    { id: 'home' as const, label: label.home, glyph: '▤', badge: 0 },
    { id: 'customers' as const, label: label.customers, glyph: '☰', badge: 3 },
    { id: 'record' as const, label: label.record, glyph: '+', badge: 0 },
    { id: 'payday' as const, label: label.payday, glyph: '◷', badge: 0 },
    { id: 'account' as const, label: label.account, glyph: '◉', badge: 0 },
  ]
}

const LABELS = {
  ar: {
    home: 'المحل',
    customers: 'العملاء',
    record: 'عملية',
    payday: 'السداد',
    account: 'حسابي',
    shopName: 'بقالة الحي',
    customersLabel: 'العملاء',
    outstanding: 'المستحق',
    overdue: 'متأخر',
    newOperation: 'عملية جديدة',
  },
  en: {
    home: 'Shop',
    customers: 'Customers',
    record: 'Record',
    payday: 'Pay-day',
    account: 'Account',
    shopName: 'The corner shop',
    customersLabel: 'Customers',
    outstanding: 'Outstanding',
    overdue: 'Overdue',
    newOperation: 'New operation',
  },
}

function ShellPrototype() {
  const { variant = 'A' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [active, setActive] = useState<Tab>('home')
  const tabs = useTabs()

  const shared = { tabs, active, onSelect: setActive }

  return (
    <>
      {variant === 'A' ? <VariantA {...shared} /> : null}
      {variant === 'B' ? <VariantB {...shared} /> : null}
      {variant === 'C' ? <VariantC {...shared} /> : null}
      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        onChange={(key) => navigate({ search: { variant: key } })}
      />
    </>
  )
}

type ShellProps = {
  tabs: ReturnType<typeof useTabs>
  active: Tab
  onSelect: (tab: Tab) => void
}

/* ------------------------------------------------------------------ */
/* A — the navbar grows out of the app bar; the phone gets a dock.      */
/* ------------------------------------------------------------------ */

function VariantA({ tabs, active, onSelect }: ShellProps) {
  const { locale } = useI18n()
  const label = LABELS[locale === 'ar' ? 'ar' : 'en']

  return (
    <div className="min-h-dvh bg-mist">
      <header className="sticky top-0 z-40 bg-ink text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 lg:px-6">
          <Mark />
          <div className="lg:me-6">
            <div className="text-[17px] leading-none font-black">سجّل</div>
            <div className="text-[10.5px] font-bold text-white/60 lg:hidden">
              {label.shopName}
            </div>
          </div>

          {/* Desktop: the same items as the dock, laid out along the bar. */}
          <nav className="hidden items-center gap-1 lg:flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelect(tab.id)}
                aria-current={tab.id === active ? 'page' : undefined}
                className={cx(
                  'relative rounded-full px-3.5 py-2 text-[13px] font-extrabold transition',
                  tab.id === active
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white',
                )}
              >
                {tab.label}
                {tab.badge > 0 ? <Badge>{tab.badge}</Badge> : null}
              </button>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <LocaleToggle className="text-white/70 hover:bg-white/10 hover:text-white" />
            <span className="hidden text-[13px] font-black text-white/80 lg:inline">
              {label.shopName}
            </span>
            <span
              className="grid size-9 place-items-center rounded-full bg-white/15 text-[13px] font-black"
              aria-hidden
            >
              ب
            </span>
          </div>
        </div>
      </header>

      <ShopScreen wide />

      {/* Phone: a dock that floats clear of the edge, thumb-high. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-sm items-stretch justify-between gap-0.5 rounded-[22px] border border-line bg-card/95 p-1.5 shadow-(--shadow-card) backdrop-blur">
          {tabs.map((tab) => (
            <DockButton
              key={tab.id}
              tab={tab}
              active={tab.id === active}
              onSelect={onSelect}
            />
          ))}
        </div>
      </nav>
      <div className="h-24 lg:hidden" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* B — a rail on desktop; on a phone a flush bar with the action on it. */
/* ------------------------------------------------------------------ */

function VariantB({ tabs, active, onSelect }: ShellProps) {
  const { locale } = useI18n()
  const label = LABELS[locale === 'ar' ? 'ar' : 'en']
  // The action is lifted out of the row and set in the middle of it, so the
  // other four sit two to a side.
  const record = tabs.find((tab) => tab.id === 'record')
  const rest = tabs.filter((tab) => tab.id !== 'record')
  const before = rest.slice(0, 2)
  const after = rest.slice(2)

  return (
    <div className="min-h-dvh bg-mist lg:ps-60">
      {/* Desktop: the whole of navigation down the start edge, labelled, so
          the top of the screen belongs to the shop rather than to the app. */}
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e border-line bg-ink px-3 py-5 text-white lg:flex">
        <div className="mb-7 flex items-center gap-2.5 px-2">
          <Mark />
          <div>
            <div className="text-[16px] leading-none font-black">سجّل</div>
            <div className="text-[10.5px] font-bold text-white/60">
              {label.shopName}
            </div>
          </div>
        </div>

        <nav className="grid gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={tab.id === active ? 'page' : undefined}
              className={cx(
                'relative flex items-center gap-3 rounded-(--radius-control) px-3 py-2.5 text-[13.5px] font-extrabold transition',
                tab.id === active
                  ? 'bg-white/15 text-white'
                  : 'text-white/55 hover:bg-white/8 hover:text-white',
              )}
            >
              <span className="w-5 text-center text-base" aria-hidden>
                {tab.glyph}
              </span>
              {tab.label}
              {tab.badge > 0 ? (
                <span className="tabular ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1.5 text-[10px] font-black">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="mt-auto grid gap-2">
          <PaydayStrip nextPaydayAt={SAMPLE_NEXT_PAYDAY} onDark />
          <LocaleToggle className="justify-self-start text-white/60 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>

      {/* Phone: a slim title bar, because the rail's job moves to the bottom. */}
      <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-line bg-mist/95 px-4 py-3 backdrop-blur lg:hidden">
        <Mark small />
        <span className="text-[15px] font-black text-ink">
          {label.shopName}
        </span>
        <LocaleToggle className="ms-auto text-muted hover:bg-neutral-bg hover:text-ink" />
      </header>

      <ShopScreen />

      {/* The bar sits flush to the edge; the one action it wants breaks its
          top line, which is the only way it reads as primary among five. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card lg:hidden">
        <div className="grid grid-cols-5 items-end pb-[max(0.375rem,env(safe-area-inset-bottom))]">
          {before.map((tab) => (
            <BarButton
              key={tab.id}
              tab={tab}
              active={tab.id === active}
              onSelect={onSelect}
            />
          ))}
          <div className="relative flex justify-center">
            <button
              type="button"
              onClick={() => onSelect('record')}
              aria-label={record?.label}
              className="-mt-6 grid size-14 place-items-center rounded-full bg-linear-135 from-gold-light to-gold text-2xl font-black text-ink shadow-lg shadow-gold/40 active:scale-95"
            >
              +
            </button>
          </div>
          {after.map((tab) => (
            <BarButton
              key={tab.id}
              tab={tab}
              active={tab.id === active}
              onSelect={onSelect}
            />
          ))}
        </div>
      </nav>
      <div className="h-20 lg:hidden" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* C — one dock. Bottom on a phone, a pill at the top on a desktop.     */
/* ------------------------------------------------------------------ */

function VariantC({ tabs, active, onSelect }: ShellProps) {
  const { locale } = useI18n()
  const label = LABELS[locale === 'ar' ? 'ar' : 'en']

  return (
    <div className="min-h-dvh bg-mist">
      <div className="mx-auto max-w-3xl px-4 pt-6 lg:pt-28">
        <div className="flex items-center gap-3">
          <Mark />
          <div>
            <div className="text-[20px] leading-none font-black text-ink">
              {label.shopName}
            </div>
            <div className="text-[11px] font-bold text-muted">سجّل</div>
          </div>
          <LocaleToggle className="ms-auto text-muted hover:bg-neutral-bg hover:text-ink" />
        </div>
      </div>

      <ShopScreen />

      {/*
        The same control at both widths, only its anchor moves: a phone wants
        it under the thumb, a desktop wants it out of the content's way. The
        labels appear when there is room for them and the icons carry it when
        there is not.
      */}
      <nav
        className={cx(
          'fixed z-40 flex justify-center px-3',
          'inset-x-0 bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          'lg:inset-x-0 lg:top-5 lg:bottom-auto lg:pb-0',
        )}
      >
        <div className="flex items-center gap-1 rounded-full border border-line bg-card/90 p-1.5 shadow-(--shadow-card) backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              aria-current={tab.id === active ? 'page' : undefined}
              title={tab.label}
              className={cx(
                'relative flex items-center gap-2 rounded-full px-3 py-2 transition lg:px-4',
                tab.id === active
                  ? 'bg-ink text-white'
                  : 'text-muted hover:bg-neutral-bg',
              )}
            >
              <span className="text-base leading-none" aria-hidden>
                {tab.glyph}
              </span>
              {/* On a phone only the chosen one is named, so five fit; on a
                  desktop all five are named. */}
              <span
                className={cx(
                  'text-[12.5px] font-black whitespace-nowrap lg:inline',
                  tab.id === active ? 'inline' : 'hidden',
                )}
              >
                {tab.label}
              </span>
              {tab.badge > 0 ? <Badge>{tab.badge}</Badge> : null}
            </button>
          ))}
        </div>
      </nav>
      <div className="h-24 lg:h-4" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The screen under the chrome, and the small parts of the chrome.      */
/* ------------------------------------------------------------------ */

/**
 * The shop's home, from the fixture. Shared on purpose: it is the constant
 * the three variants are judged against, and the layout around it is what
 * each one is free to disagree about.
 */
function ShopScreen({ wide = false }: { wide?: boolean }) {
  const { locale, money, number, date } = useI18n()
  const label = LABELS[locale === 'ar' ? 'ar' : 'en']

  const outstanding = SAMPLE_CUSTOMERS.reduce(
    (total, row) => total + row.balanceHalalas,
    0,
  )
  const overdue = SAMPLE_CUSTOMERS.filter(
    (row) => row.status === 'overdue',
  ).reduce((total, row) => total + row.balanceHalalas, 0)

  return (
    <main
      className={cx(
        'mx-auto w-full px-4 py-4',
        wide ? 'max-w-5xl lg:px-6' : 'max-w-3xl',
      )}
    >
      <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile
          label={label.customersLabel}
          value={number(SAMPLE_CUSTOMERS.length)}
        />
        <StatTile
          label={label.outstanding}
          value={money(outstanding)}
          tone="gold"
        />
        <StatTile
          label={label.overdue}
          value={money(overdue)}
          tone="bad"
          marked
        />
      </div>

      {/* Wide screens put the standing figures beside the list rather than
          stacking a phone's column down the middle of a monitor. */}
      <div className="grid gap-3 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="lg:order-1">
          {SAMPLE_CUSTOMERS.map((row, index) => (
            <Card key={row.mobile}>
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
                label={label.outstanding}
                emphasis
                tone={row.status === 'overdue' ? 'bad' : 'plain'}
              >
                {money(row.balanceHalalas)}
              </KeyValueRow>
              <KeyValueRow label={label.payday}>
                {row.dueAt ? date(row.dueAt) : '—'}
              </KeyValueRow>
            </Card>
          ))}
        </div>

        <div className="lg:order-2">
          <Card className="p-4">
            <PaydayStrip nextPaydayAt={SAMPLE_NEXT_PAYDAY} />
          </Card>
          <OperationsCounter purchases={18} payments={11} />
        </div>
      </div>
    </main>
  )
}

function DockButton({
  tab,
  active,
  onSelect,
}: {
  tab: ShellProps['tabs'][number]
  active: boolean
  onSelect: (tab: Tab) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative flex flex-1 flex-col items-center gap-1 rounded-[16px] py-2 transition',
        active ? 'bg-neutral-bg text-ink' : 'text-faint',
      )}
    >
      <span className="text-base leading-none" aria-hidden>
        {tab.glyph}
      </span>
      <span className="text-[10px] font-extrabold">{tab.label}</span>
      {tab.badge > 0 ? <Badge>{tab.badge}</Badge> : null}
    </button>
  )
}

function BarButton({
  tab,
  active,
  onSelect,
}: {
  tab: ShellProps['tabs'][number]
  active: boolean
  onSelect: (tab: Tab) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 transition',
        active ? 'text-steel' : 'text-faint',
      )}
    >
      <span className="text-base leading-none" aria-hidden>
        {tab.glyph}
      </span>
      <span className="text-[10px] font-extrabold">{tab.label}</span>
      {tab.badge > 0 ? <Badge>{tab.badge}</Badge> : null}
    </button>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="tabular absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-lg bg-bad px-1 text-[9.5px] font-black text-white">
      {children}
    </span>
  )
}

function Mark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={cx(
        'grid flex-none place-items-center rounded-[12px] bg-linear-135 from-gold-light via-gold to-gold-dark font-black text-ink',
        small ? 'size-8 text-[15px]' : 'size-10 text-lg',
      )}
      aria-hidden
    >
      س
    </span>
  )
}
