import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'

/**
 * #74: what a dock tap costs, measured rather than judged by eye, and kept in
 * the repository so a later change can be shown moving it.
 *
 * Run it against a local production build:
 *
 *   npm run build && npm run db:seed -- --reset && npm start   # in one shell
 *   npm run measure                                            # in another
 *
 * Or against a deployment, from a machine that can reach it:
 *
 *   MEASURE_URL=https://… MEASURE_COOKIE='sejjel_session=…' npm run measure
 *
 * The cookie is how a deployment is measured at all: signing in needs a code
 * from a phone, so somebody signs in by hand and hands the session over.
 * Locally the fake sender writes codes to a file and this reads them.
 *
 * `MEASURE_ONLY` runs the legs whose name contains it; `MEASURE_ROUNDS` says
 * how many taps a leg gets. The numbers land in `measurements/navigation.json`
 * and belong in a commit: this is a record of where the app stands, not a
 * gate. Timing in a container is not timing on a phone, and what a tap costs
 * in requests — the part that does not move with the machine — is already
 * guarded by the browser suite.
 */

const url = process.env.MEASURE_URL ?? 'http://127.0.0.1:3100'
const cookie = process.env.MEASURE_COOKIE
const OTP_LOG = process.env.OTP_LOG_FILE ?? './.e2e/otp.log'
const ROUNDS = Number(process.env.MEASURE_ROUNDS ?? 11)
const OUT = './measurements/navigation.json'

const ONLY = process.env.MEASURE_ONLY

/** The taps worth a number: both docks, and coming back as well as going. */
const LEGS = [
  {
    side: 'customer' as const,
    name: 'ledger → card',
    from: '/customer',
    click: '[data-testid="dock"] a[href="/customer/card"]',
  },
  {
    side: 'customer' as const,
    name: 'card → ledger',
    from: '/customer/card',
    click: '[data-testid="dock"] a[href="/customer"]',
  },
  {
    side: 'customer' as const,
    name: 'ledger → notifications',
    from: '/customer',
    click: '[data-testid="dock"] a[href="/customer/notifications"]',
  },
  {
    side: 'merchant' as const,
    name: 'shop → record',
    from: '/merchant',
    click: '[data-testid="dock"] a[href="/merchant/record"]',
  },
  {
    side: 'merchant' as const,
    name: 'record → shop',
    from: '/merchant/record',
    click: '[data-testid="dock"] a[href="/merchant"]',
  },
  {
    side: 'merchant' as const,
    name: 'shop → scan',
    from: '/merchant',
    click: '[data-testid="dock"] a[href="/merchant/scan"]',
  },
]

const PEOPLE = {
  customer: { typed: '0550123456', e164: '+966550123456' },
  merchant: { typed: '0550111222', e164: '+966550111222' },
}

type Leg = (typeof LEGS)[number]

type Round = {
  /** Click to the new screen committed: the 100ms budget. */
  committed: number
  /** Click to nothing left in flight: the 500ms budget. */
  settled: number
  /** One entry per server function the tap cost. */
  requests: Array<{ total: number; server: number }>
}

/**
 * Both pieces below run in the page, and both are written as source text on
 * purpose: the compiler this script runs through renames functions with a
 * helper of its own, and that helper does not exist in the browser, so a
 * function handed over as a function arrives broken.
 *
 * The instrument counts the server functions a tap costs — every one is its
 * own `fetch`, so patching `fetch` is how in-flight is known — and asks the
 * router itself when a navigation is done.
 */
const INSTRUMENT = String.raw`
(() => {
  if (window.__measure) return
  const state = {
    t0: 0,
    committed: null,
    settledAt: 0,
    inflight: 0,
    count: 0,
    begin() {
      state.committed = null
      state.settledAt = 0
      state.count = 0
      state.t0 = performance.now()
      return state.t0
    },
  }
  window.__measure = state

  const original = window.fetch
  window.fetch = async (...args) => {
    const first = args[0]
    const href =
      typeof first === 'string'
        ? first
        : first instanceof Request
          ? first.url
          : String(first)
    const ours = href.includes('/_serverFn/')
    if (ours) state.inflight++
    try {
      return await original(...args)
    } finally {
      if (ours) {
        state.inflight--
        state.count++
        state.settledAt = performance.now()
      }
    }
  }

  window.__TSR_ROUTER__.subscribe('onResolved', () => {
    if (state.t0 && state.committed === null) {
      state.committed = performance.now() - state.t0
    }
  })
})()
`

/**
 * The tap is made inside the page: a click driven from out here would have the
 * driver's round trip in the middle of the number.
 *
 * Settled is nothing in flight and nothing new asked for in 150ms, so a screen
 * that fetches something of its own after it paints — the card mints its code
 * — is waited for rather than missed.
 */
/** Back to where the leg starts, inside the router, so the next round is as
 * warm as the tap it is measuring. A document load would empty the cache and
 * every round would be a first visit.
 *
 * It waits for the screen to settle as well: a tap measured while the one
 * before it is still finishing is a tap nobody makes. */
const RETURN = (to: string) => String.raw`
(async () => {
  await window.__TSR_ROUTER__.navigate({ to: ${JSON.stringify(to)}, search: {} })
  const state = window.__measure
  const deadline = performance.now() + 5000
  while (performance.now() < deadline) {
    await new Promise((frame) => requestAnimationFrame(frame))
    if (state.inflight === 0 && !window.__TSR_ROUTER__.state.isLoading) break
  }
})()
`

const TAP = (selector: string) => String.raw`
(async () => {
  const state = window.__measure
  const link = document.querySelector(${JSON.stringify(selector)})
  if (!state || !link) throw new Error('Nothing to tap at ' + ${JSON.stringify(selector)})

  const from = state.begin()
  link.click()

  const deadline = from + 10000
  let quietSince = 0
  while (performance.now() < deadline) {
    await new Promise((frame) => requestAnimationFrame(frame))
    if (state.inflight !== 0 || state.committed === null) {
      quietSince = 0
      continue
    }
    const since = performance.now()
    if (!quietSince) quietSince = since
    if (since - quietSince > 150) break
  }

  const asked = performance
    .getEntriesByType('resource')
    .filter((entry) => entry.name.includes('/_serverFn/') && entry.startTime >= from)

  return {
    committed: state.committed === null ? -1 : state.committed,
    settled:
      Math.max(state.settledAt, from + (state.committed || 0)) - from,
    requests: asked.map((entry) => ({
      total: entry.responseEnd - entry.startTime,
      // What the request spent waiting for an answer: the network out and
      // back, and the server's own work, which is all one number from here.
      server: entry.responseStart - entry.requestStart,
    })),
  }
})()
`

async function timeOne(page: Page, leg: Leg): Promise<Round> {
  return page.evaluate<Round>(TAP(leg.click))
}

function median(numbers: Array<number>) {
  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

function codeSentTo(phoneNumber: string) {
  const lines = readFileSync(OTP_LOG, 'utf8').trim().split('\n')
  const line = lines.reverse().find((entry) => entry.startsWith(phoneNumber))
  if (!line) throw new Error(`No code was sent to ${phoneNumber}`)
  return line.split(' ')[1]
}

async function signedInPage(browser: Browser, side: 'customer' | 'merchant') {
  const context = await browser.newContext({ baseURL: url })
  // The app asks Google Fonts for Cairo; a pending stylesheet holds the
  // document's load event open, and the stream waits for that.
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
    route.abort(),
  )

  if (cookie) {
    const [name, ...rest] = cookie.split('=')
    await context.addCookies([
      { name, value: rest.join('='), url, sameSite: 'Lax' },
    ])
    const page = await context.newPage()
    return page
  }

  const person = PEOPLE[side]
  const page = await context.newPage()
  await page.goto('/sign-in')
  await page.getByLabel('رقم الجوال').fill(person.typed)
  await page.getByRole('button', { name: 'أرسل الرمز' }).click()
  await page.getByTestId('code-boxes').waitFor()
  await page.getByLabel('الرقم 1').click()
  await page.keyboard.type(codeSentTo(person.e164))
  await page.waitForURL((at) => !at.pathname.endsWith('/sign-in'))
  return page
}

async function measure() {
  const preinstalled = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium'
  const browser = await chromium.launch(
    existsSync(preinstalled) ? { executablePath: preinstalled } : {},
  )

  const results = []
  for (const side of ['customer', 'merchant'] as const) {
    const page = await signedInPage(browser, side)
    // A dock item is an anchor, so a tap before the client router exists is an
    // ordinary document navigation and nothing here is in play.
    await page.waitForFunction(() => '__TSR_ROUTER__' in window)

    for (const leg of LEGS.filter(
      (one) => one.side === side && (!ONLY || one.name.includes(ONLY)),
    )) {
      const rounds: Array<Round> = []
      await page.goto(leg.from)
      await page.waitForFunction(() => '__TSR_ROUTER__' in window)
      await page.evaluate(INSTRUMENT)

      for (let index = 0; index < ROUNDS; index++) {
        rounds.push(await timeOne(page, leg))
        await page.evaluate(RETURN(leg.from))
        await page.waitForURL((at) => at.pathname === leg.from)
      }

      // The first round of a leg pays for a screen the router has never held,
      // which is a different number from the one a person taps all day.
      const [cold, ...warm] = rounds
      results.push({
        leg: leg.name,
        side,
        cold: {
          committed: round(cold.committed),
          settled: round(cold.settled),
        },
        committed: round(median(warm.map((one) => one.committed))),
        settled: round(median(warm.map((one) => one.settled))),
        requests: round(median(warm.map((one) => one.requests.length))),
        waiting: round(
          median(
            warm.map((one) =>
              one.requests.reduce((sum, entry) => sum + entry.server, 0),
            ),
          ),
        ),
      })
      console.log(results.at(-1))
    }
    await page.context().close()
  }

  await browser.close()

  const head = execSync('git rev-parse --short HEAD').toString().trim()
  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        measured: new Date().toISOString().slice(0, 10),
        commit: head,
        url,
        rounds: ROUNDS,
        note:
          'committed: click to the new screen on screen. settled: click to ' +
          'nothing left in flight. waiting: of that, time spent waiting for ' +
          'server functions to answer — the network out and back and the ' +
          "server's own work, which cannot be told apart from the browser. " +
          'cold is the first tap of a leg, the rest are the median of the ' +
          'others. Milliseconds.',
        legs: results,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`Written to ${OUT}`)
}

await measure()
