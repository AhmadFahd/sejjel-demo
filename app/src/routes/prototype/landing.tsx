import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PrototypeSwitcher } from '#/components/prototype-switcher'
import { cx } from '#/components/primitives'
import { LocaleToggle } from '#/components/locale-toggle'
import { useI18n } from '#/i18n/context'
import type { Locale } from '#/i18n/locales'
import type { ReactNode } from 'react'

/**
 * PROTOTYPE. Three variants of a public landing page — the app has none today,
 * `/` only redirects — switchable with `?variant=`. Throwaway: the copy lives
 * here rather than in the message catalogue, so nothing in `src/i18n` has to
 * carry it before a variant has won.
 */

const VARIANTS = [
  { key: 'A', name: 'Phone in hand' },
  { key: 'B', name: 'Two doors' },
  { key: 'C', name: 'The ledger, step by step' },
] as const

type VariantKey = (typeof VARIANTS)[number]['key']

function isVariant(value: unknown): value is VariantKey {
  return VARIANTS.some((variant) => variant.key === value)
}

export const Route = createFileRoute('/prototype/landing')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { variant?: VariantKey } =>
    isVariant(search.variant) ? { variant: search.variant } : {},
  component: LandingPrototype,
})

function LandingPrototype() {
  const { variant = 'A' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { locale } = useI18n()
  const copy = COPY[locale]

  return (
    <>
      {variant === 'A' ? <VariantA copy={copy} /> : null}
      {variant === 'B' ? <VariantB copy={copy} /> : null}
      {variant === 'C' ? <VariantC copy={copy} /> : null}
      <PrototypeSwitcher
        variants={VARIANTS}
        current={variant}
        onChange={(key) => navigate({ search: { variant: key } })}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Variant A — dark hero, a phone beside it, sticky call to action.     */
/* ------------------------------------------------------------------ */

function VariantA({ copy }: { copy: Copy }) {
  return (
    <div className="min-h-dvh bg-mist pb-24 lg:pb-0">
      <MarketingBar copy={copy} tone="dark" />

      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:py-20">
          <div>
            <Eyebrow tone="dark">{copy.eyebrow}</Eyebrow>
            <h1 className="mt-4 text-[30px] leading-[1.15] font-black sm:text-[40px] lg:text-[52px]">
              {copy.heroTitle}
            </h1>
            <p className="mt-4 max-w-lg text-[14px] leading-relaxed font-bold text-white/75 sm:text-[16px]">
              {copy.heroBody}
            </p>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <CallToAction href="/sign-in" tone="gold">
                {copy.ctaPrimary}
              </CallToAction>
              <CallToAction href="#how" tone="outline">
                {copy.ctaSecondary}
              </CallToAction>
            </div>
            <p className="mt-4 text-[12px] font-bold text-white/50">
              {copy.trust}
            </p>
          </div>

          {/* A screen of the thing, rather than a promise about it. */}
          <PhoneMock copy={copy} />
        </div>
      </section>

      <section
        id="how"
        className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-20"
      >
        <h2 className="text-[22px] font-black text-ink sm:text-[28px]">
          {copy.benefitsTitle}
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
          {copy.benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-(--radius-card) bg-card p-5 shadow-(--shadow-card)"
            >
              <span
                className="grid size-10 place-items-center rounded-xl bg-gold/15 text-lg text-gold-dark"
                aria-hidden
              >
                {benefit.glyph}
              </span>
              <h3 className="mt-3 text-[16px] font-black text-ink">
                {benefit.title}
              </h3>
              <p className="mt-1.5 text-[13px] leading-relaxed font-bold text-muted">
                {benefit.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <PaydayBand copy={copy} />
      <MarketingFoot copy={copy} />

      {/* The mobile equivalent of the dock: the one action, always in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <CallToAction href="/sign-in" tone="gold" className="w-full">
          {copy.ctaPrimary}
        </CallToAction>
      </div>
    </div>
  )
}

function PhoneMock({ copy }: { copy: Copy }) {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="rounded-[34px] border-[6px] border-black/40 bg-mist p-3 shadow-2xl shadow-black/40">
        <div className="mb-3 flex items-center gap-2">
          <span
            className="grid size-8 place-items-center rounded-[11px] bg-linear-135 from-gold-light via-gold to-gold-dark text-[15px] font-black text-ink"
            aria-hidden
          >
            س
          </span>
          <span className="text-[13px] font-black text-ink">
            {copy.mockShop}
          </span>
        </div>
        <div className="rounded-(--radius-card) bg-card p-4 shadow-(--shadow-card)">
          <div className="text-[11px] font-extrabold text-muted">
            {copy.mockBalanceLabel}
          </div>
          <div className="tabular mt-1 text-[26px] font-black text-ink">
            {copy.mockBalance}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-bg">
            <div className="h-full w-[68%] rounded-full bg-gold" />
          </div>
          <div className="mt-2 text-[11px] font-bold text-muted">
            {copy.mockLimit}
          </div>
        </div>
        <div className="mt-2 rounded-(--radius-control) border border-gold/20 bg-linear-135 from-warn-bg to-white p-3">
          <div className="text-[12px] font-black text-ink">
            {copy.mockPayday}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Variant B — the page is split by who you are, not by what it does.   */
/* ------------------------------------------------------------------ */

function VariantB({ copy }: { copy: Copy }) {
  const [door, setDoor] = useState<'merchant' | 'customer'>('merchant')

  return (
    <div className="flex min-h-dvh flex-col bg-mist">
      <MarketingBar copy={copy} tone="light" />

      <div className="mx-auto w-full max-w-3xl px-5 pt-10 pb-6 text-center sm:px-8 lg:max-w-5xl lg:pt-14">
        <h1 className="text-[26px] leading-tight font-black text-ink sm:text-[34px]">
          {copy.doorsTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[13.5px] leading-relaxed font-bold text-muted sm:text-[15px]">
          {copy.doorsBody}
        </p>
      </div>

      {/* Small screens pick a door and read one; wide screens read both. */}
      <div className="px-5 pb-4 sm:px-8 lg:hidden">
        <div
          role="tablist"
          className="grid grid-cols-2 gap-1 rounded-full bg-neutral-bg p-1"
        >
          {(['merchant', 'customer'] as const).map((which) => (
            <button
              key={which}
              role="tab"
              type="button"
              aria-selected={door === which}
              onClick={() => setDoor(which)}
              className={cx(
                'rounded-full py-2.5 text-[13px] font-black transition',
                door === which
                  ? 'bg-card text-ink shadow-(--shadow-tile)'
                  : 'text-muted',
              )}
            >
              {copy.doors[which].tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid flex-1 lg:grid-cols-2">
        <Door
          copy={copy}
          which="merchant"
          hiddenOnSmall={door !== 'merchant'}
          tone="dark"
        />
        <Door
          copy={copy}
          which="customer"
          hiddenOnSmall={door !== 'customer'}
          tone="light"
        />
      </div>

      <MarketingFoot copy={copy} />
    </div>
  )
}

function Door({
  copy,
  which,
  hiddenOnSmall,
  tone,
}: {
  copy: Copy
  which: 'merchant' | 'customer'
  hiddenOnSmall: boolean
  tone: 'dark' | 'light'
}) {
  const door = copy.doors[which]
  const dark = tone === 'dark'

  return (
    <section
      className={cx(
        'px-6 py-9 sm:px-10 sm:py-12 lg:py-16',
        hiddenOnSmall ? 'hidden lg:block' : 'block',
        dark ? 'bg-ink text-white' : 'bg-card text-ink',
      )}
    >
      <div
        className={cx(
          'mx-auto max-w-md',
          dark ? 'lg:ms-auto lg:me-8' : 'lg:me-auto lg:ms-8',
        )}
      >
        <Eyebrow tone={dark ? 'dark' : 'light'}>{door.tab}</Eyebrow>
        <h2 className="mt-3 text-[24px] leading-tight font-black sm:text-[30px]">
          {door.title}
        </h2>
        <ul className="mt-5 grid gap-3">
          {door.lines.map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <span
                className={cx(
                  'mt-0.5 grid size-5 flex-none place-items-center rounded-full text-[11px]',
                  dark
                    ? 'bg-gold/25 text-gold-light'
                    : 'bg-good-bg text-good-text',
                )}
                aria-hidden
              >
                ✓
              </span>
              <span
                className={cx(
                  'text-[13.5px] leading-relaxed font-extrabold',
                  dark ? 'text-white/85' : 'text-muted',
                )}
              >
                {line}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-7">
          <CallToAction
            href="/sign-in"
            tone={dark ? 'gold' : 'ink'}
            className="w-full sm:w-auto"
          >
            {door.cta}
          </CallToAction>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Variant C — the page is the ledger's own story, four steps of it.    */
/* ------------------------------------------------------------------ */

function VariantC({ copy }: { copy: Copy }) {
  return (
    <div className="min-h-dvh bg-card">
      <MarketingBar copy={copy} tone="light" sticky />

      <section className="mx-auto max-w-4xl px-5 pt-12 pb-8 sm:px-8 lg:pt-16">
        <Eyebrow tone="light">{copy.eyebrow}</Eyebrow>
        <h1 className="mt-4 max-w-2xl text-[28px] leading-[1.2] font-black text-ink sm:text-[38px] lg:text-[46px]">
          {copy.storyTitle}
        </h1>
        <p className="mt-4 max-w-xl text-[14px] leading-relaxed font-bold text-muted sm:text-[16px]">
          {copy.storyBody}
        </p>
      </section>

      {/* One column on a phone, a strip of four across a desktop. */}
      <section
        id="how"
        className="mx-auto max-w-6xl px-5 pb-10 sm:px-8 lg:pb-16"
      >
        <ol className="relative grid gap-0 lg:grid-cols-4 lg:gap-6">
          <span
            className="absolute top-0 bottom-0 start-[19px] w-px bg-line lg:inset-x-0 lg:top-[19px] lg:bottom-auto lg:h-px lg:w-auto"
            aria-hidden
          />
          {copy.steps.map((step, index) => (
            <li
              key={step.title}
              className="relative flex gap-4 pb-8 lg:block lg:pb-0"
            >
              <span className="tabular relative z-10 grid size-10 flex-none place-items-center rounded-full bg-ink text-[14px] font-black text-white">
                {index + 1}
              </span>
              <div className="lg:mt-4">
                <h3 className="text-[16px] font-black text-ink sm:text-[18px]">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed font-bold text-muted">
                  {step.body}
                </p>
                <div className="mt-3 rounded-(--radius-control) border border-line bg-mist p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-black text-ink">
                      {step.rowLabel}
                    </span>
                    <b className="tabular text-[13px] font-black text-ink">
                      {step.rowValue}
                    </b>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <PaydayBand copy={copy} />

      <section className="mx-auto max-w-4xl px-5 py-12 text-center sm:px-8 lg:py-16">
        <h2 className="text-[22px] font-black text-ink sm:text-[28px]">
          {copy.closeTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed font-bold text-muted">
          {copy.trust}
        </p>
        <div className="mx-auto mt-6 max-w-xs">
          <CallToAction href="/sign-in" tone="ink" className="w-full">
            {copy.ctaPrimary}
          </CallToAction>
        </div>
      </section>

      <MarketingFoot copy={copy} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pieces the variants share. A bar and a footer, nothing structural.   */
/* ------------------------------------------------------------------ */

function MarketingBar({
  copy,
  tone,
  sticky = false,
}: {
  copy: Copy
  tone: 'dark' | 'light'
  sticky?: boolean
}) {
  const dark = tone === 'dark'

  return (
    <header
      className={cx(
        'z-50 w-full',
        sticky && 'sticky top-0 backdrop-blur',
        dark ? 'bg-ink text-white' : 'border-b border-line bg-card/90 text-ink',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5 sm:px-8">
        <span
          className="grid size-9 flex-none place-items-center rounded-xl bg-linear-135 from-gold-light via-gold to-gold-dark text-[17px] font-black text-ink"
          aria-hidden
        >
          س
        </span>
        <span className="text-[17px] font-black">{copy.appName}</span>

        <nav className="ms-auto hidden items-center gap-6 sm:flex">
          {copy.nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cx(
                'text-[13px] font-extrabold transition',
                dark
                  ? 'text-white/70 hover:text-white'
                  : 'text-muted hover:text-ink',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1 sm:ms-6">
          <LocaleToggle
            className={
              dark
                ? 'text-white/70 hover:bg-white/10 hover:text-white'
                : 'text-muted hover:bg-neutral-bg hover:text-ink'
            }
          />
          <a
            href="/sign-in"
            className={cx(
              'inline-flex items-center rounded-full px-4 py-2 text-[13px] font-black transition active:scale-[0.98]',
              dark ? 'bg-white text-ink' : 'bg-ink text-white',
            )}
          >
            {copy.signIn}
          </a>
        </div>
      </div>
    </header>
  )
}

function PaydayBand({ copy }: { copy: Copy }) {
  return (
    <section className="bg-linear-135 from-gold-light via-gold to-gold-dark">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 sm:flex-row sm:items-center sm:gap-6 sm:px-8 lg:py-10">
        <h2 className="text-[20px] font-black text-ink sm:text-[26px]">
          {copy.paydayTitle}
        </h2>
        <p className="text-[13px] font-extrabold text-ink/70 sm:text-[14px]">
          {copy.paydayBody}
        </p>
      </div>
    </section>
  )
}

function MarketingFoot({ copy }: { copy: Copy }) {
  return (
    <footer className="border-t border-line bg-mist">
      <div className="mx-auto max-w-6xl px-5 py-7 text-[12px] font-bold text-muted sm:px-8">
        {copy.footer}
      </div>
    </footer>
  )
}

function Eyebrow({
  tone,
  children,
}: {
  tone: 'dark' | 'light'
  children: ReactNode
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black',
        tone === 'dark'
          ? 'bg-white/10 text-gold-light'
          : 'bg-neutral-bg text-muted',
      )}
    >
      {children}
    </span>
  )
}

function CallToAction({
  href,
  tone,
  className,
  children,
}: {
  href: string
  tone: 'gold' | 'ink' | 'outline'
  className?: string
  children: ReactNode
}) {
  const tones = {
    gold: 'bg-linear-135 from-gold-light to-gold text-ink',
    ink: 'bg-ink text-white',
    outline: 'border-[1.5px] border-white/30 text-white',
  } as const

  return (
    <a
      href={href}
      className={cx(
        'inline-flex items-center justify-center rounded-(--radius-control) px-6 py-3.5 text-[14.5px] font-black transition active:scale-[0.98]',
        tones[tone],
        className,
      )}
    >
      {children}
    </a>
  )
}

/* ------------------------------------------------------------------ */
/* Copy. Throwaway, so it lives beside the variants rather than in the  */
/* catalogue — but still in both languages, because direction is half   */
/* of what a layout has to survive.                                     */
/* ------------------------------------------------------------------ */

type Copy = {
  appName: string
  signIn: string
  nav: Array<{ label: string; href: string }>
  eyebrow: string
  heroTitle: string
  heroBody: string
  ctaPrimary: string
  ctaSecondary: string
  trust: string
  mockShop: string
  mockBalanceLabel: string
  mockBalance: string
  mockLimit: string
  mockPayday: string
  benefitsTitle: string
  benefits: Array<{ glyph: string; title: string; body: string }>
  doorsTitle: string
  doorsBody: string
  doors: Record<
    'merchant' | 'customer',
    { tab: string; title: string; lines: Array<string>; cta: string }
  >
  storyTitle: string
  storyBody: string
  steps: Array<{
    title: string
    body: string
    rowLabel: string
    rowValue: string
  }>
  closeTitle: string
  paydayTitle: string
  paydayBody: string
  footer: string
}

const COPY: Record<Locale, Copy> = {
  ar: {
    appName: 'سجّل',
    signIn: 'دخول',
    nav: [
      { label: 'كيف يشتغل', href: '#how' },
      { label: 'للمحلات', href: '#how' },
      { label: 'للعملاء', href: '#how' },
    ],
    eyebrow: 'دفتر المحل، بلا ورق',
    heroTitle: 'الدفتر بين المحل وعميله، على الجوال',
    heroBody:
      'المحل يكتب العملية، العميل يوافق عليها من جواله، ويوم الثلاثاء يسدد. رقم واحد يراه الطرفان، فلا خلاف عليه بعدها.',
    ctaPrimary: 'ابدأ برقم جوالك',
    ctaSecondary: 'كيف يشتغل',
    trust: 'بدون كلمة مرور. رمز واحد يصل جوالك.',
    mockShop: 'بقالة الحي',
    mockBalanceLabel: 'الرصيد الحالي',
    mockBalance: '٨٠٠٫٠٠ ر.س',
    mockLimit: '٦٨٪ من الحد مستخدم',
    mockPayday: 'يوم السداد: الثلاثاء ١٥ سبتمبر',
    benefitsTitle: 'ثلاثة أشياء تحسمها',
    benefits: [
      {
        glyph: '=',
        title: 'رقم واحد للطرفين',
        body: 'ما يكتبه المحل هو ما يراه العميل، في نفس اللحظة وبنفس الرقم.',
      },
      {
        glyph: '✓',
        title: 'لا قيد بلا موافقة',
        body: 'العملية تظهر على جوال العميل أولاً. ما يُقيَّد عليه شيء قبل أن يوافق.',
      },
      {
        glyph: '◷',
        title: 'يوم سداد واحد',
        body: 'كل ما على العميل يحل يوم الثلاثاء، فالسداد موعد واحد لا مواعيد متفرقة.',
      },
    ],
    doorsTitle: 'من أي باب تدخل؟',
    doorsBody:
      'الطرفان في دفتر واحد، لكن الشاشة تختلف: المحل يكتب ويتابع، والعميل يوافق ويسدد.',
    doors: {
      merchant: {
        tab: 'عندي محل',
        title: 'اكتب العملية، وخل الدفتر يمشي وحده',
        lines: [
          'اكتب المبلغ وأرسله للعميل ليوافق.',
          'اعرف في لحظة من تأخر ومن سدد.',
          'حصيلة المحل كلها في شاشة واحدة.',
          'حد ائتمان لكل عميل، تغيّره متى شئت.',
        ],
        cta: 'افتح محلك',
      },
      customer: {
        tab: 'أشتري بالأجل',
        title: 'اعرف كم عليك، ولمن، وسدده من جوالك',
        lines: [
          'كل محل تتعامل معه، ورصيدك عنده.',
          'وافق على كل عملية قبل أن تُقيَّد عليك.',
          'سدد الكل أو جزءاً منه، من الجوال.',
          'موعد واحد للسداد: الثلاثاء.',
        ],
        cta: 'ادخل برقمك',
      },
    },
    storyTitle: 'عملية واحدة، من أولها إلى تسديدها',
    storyBody:
      'هذا كل ما في سجّل. أربع خطوات، لا خامسة لها، ولا ورقة في أي منها.',
    steps: [
      {
        title: 'المحل يكتب العملية',
        body: 'المبلغ ووصف قصير، ثم ترسل للعميل.',
        rowLabel: 'شراء',
        rowValue: '١٬٠٠٠٫٠٠ ر.س',
      },
      {
        title: 'العميل يوافق',
        body: 'تظهر على جواله. لا شيء يُقيَّد قبل موافقته.',
        rowLabel: 'بانتظار الموافقة',
        rowValue: '—',
      },
      {
        title: 'تدخل الدفتر',
        body: 'الرصيد يتحدث عند الطرفين في اللحظة نفسها.',
        rowLabel: 'الرصيد',
        rowValue: '٨٠٠٫٠٠ ر.س',
      },
      {
        title: 'يوم الثلاثاء يسدد',
        body: 'كل ما عليه يحل في يوم واحد، ويسدده من جواله.',
        rowLabel: 'مسدد',
        rowValue: '٠٫٠٠ ر.س',
      },
    ],
    closeTitle: 'ابدأ برقم جوالك',
    paydayTitle: 'يوم سداد واحد: كل ثلاثاء',
    paydayBody: 'كل ما يُستحق يقع في يوم واحد، ليكون السداد موعداً لا مواعيد.',
    footer: 'سجّل — دفتر بين تاجر وعميل. المبالغ بالريال السعودي.',
  },
  en: {
    appName: 'Sejjel',
    signIn: 'Sign in',
    nav: [
      { label: 'How it works', href: '#how' },
      { label: 'For shops', href: '#how' },
      { label: 'For customers', href: '#how' },
    ],
    eyebrow: 'The shop ledger, off paper',
    heroTitle: 'The ledger between a shop and its customer, on the phone',
    heroBody:
      'The shop records the purchase, the customer approves it on their phone, and on Tuesday it is paid. Both sides read the same figure, so there is nothing left to argue about.',
    ctaPrimary: 'Start with your mobile number',
    ctaSecondary: 'How it works',
    trust: 'No password. One code, sent to your phone.',
    mockShop: 'The corner shop',
    mockBalanceLabel: 'Current balance',
    mockBalance: 'SAR 800.00',
    mockLimit: '68% of the limit used',
    mockPayday: 'Pay-day: Tuesday 15 September',
    benefitsTitle: 'Three things it settles',
    benefits: [
      {
        glyph: '=',
        title: 'One figure, both sides',
        body: 'What the shop records is what the customer sees, at the same moment and to the halala.',
      },
      {
        glyph: '✓',
        title: 'Nothing recorded unapproved',
        body: 'The purchase reaches the customer first. Nothing goes on their ledger until they agree to it.',
      },
      {
        glyph: '◷',
        title: 'One day to pay',
        body: 'Everything falls due on Tuesday, so paying is one appointment rather than a dozen.',
      },
    ],
    doorsTitle: 'Which side are you on?',
    doorsBody:
      'One ledger, two screens: the shop records and follows up, the customer approves and pays.',
    doors: {
      merchant: {
        tab: 'I keep a shop',
        title: 'Record it once, and let the ledger keep itself',
        lines: [
          'Enter the amount and send it for approval.',
          'See at a glance who is late and who has settled.',
          'The whole shop’s position on one screen.',
          'A credit limit per customer, changed whenever you like.',
        ],
        cta: 'Open your shop',
      },
      customer: {
        tab: 'I buy on credit',
        title: 'Know what you owe, to whom, and pay it from your phone',
        lines: [
          'Every shop you deal with, and your balance at each.',
          'Approve every purchase before it lands on you.',
          'Pay all of it or part of it, from the phone.',
          'One due day: Tuesday.',
        ],
        cta: 'Sign in with your number',
      },
    },
    storyTitle: 'One purchase, from the counter to settled',
    storyBody:
      'This is the whole of Sejjel. Four steps, no fifth one, and no paper in any of them.',
    steps: [
      {
        title: 'The shop records it',
        body: 'An amount and a short description, sent to the customer.',
        rowLabel: 'Purchase',
        rowValue: 'SAR 1,000.00',
      },
      {
        title: 'The customer approves',
        body: 'It appears on their phone. Nothing is recorded before they agree.',
        rowLabel: 'Awaiting approval',
        rowValue: '—',
      },
      {
        title: 'It joins the ledger',
        body: 'The balance moves on both sides in the same moment.',
        rowLabel: 'Balance',
        rowValue: 'SAR 800.00',
      },
      {
        title: 'Tuesday, it is paid',
        body: 'Everything owed falls due together, and is paid from the phone.',
        rowLabel: 'Settled',
        rowValue: 'SAR 0.00',
      },
    ],
    closeTitle: 'Start with your mobile number',
    paydayTitle: 'One due day: every Tuesday',
    paydayBody:
      'Everything owed falls due together, so paying is one appointment rather than a dozen.',
    footer:
      'Sejjel — a ledger between a shop and its customers. Amounts in SAR.',
  },
}
