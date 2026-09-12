import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import {
  LINK_DAYS,
  linkExpiresAt,
  linkState,
  paymentLinkUrl,
  whatsappUrl,
} from '#/lib/payment-link'
import {
  issuePaymentLink,
  payWithLink,
  readPaymentLink,
} from '#/db/queries/payment-link'
import { getConnectionSummary } from '#/db/queries/ledger'
import { listNotifications } from '#/db/queries/notifications'
import { paymentLinks } from '#/db/schema'
import { createFakePaymentGateway } from '#/providers/payments-fake'
import { riyalsToHalalas } from '#/lib/money'
import { createTestDatabase } from '../support/database'
import {
  makeConnection,
  makeMerchant,
  makeTransaction,
  makeUser,
} from '../support/factories'
import type { Database } from '#/db/client'

const NOW = new Date('2026-09-10T09:00:00Z')

describe('what a link is worth, and until when', () => {
  const live = {
    amountHalalas: riyalsToHalalas(800),
    expiresAt: new Date(NOW.getTime() + 60_000),
    consumedAt: null,
  }

  it('lasts one turn of the pay-day', () => {
    const until = linkExpiresAt(NOW)
    expect(until.getTime() - NOW.getTime()).toBe(
      LINK_DAYS * 24 * 60 * 60 * 1000,
    )
  })

  it('is payable while it is live and the amount is still owed', () => {
    expect(linkState(live, riyalsToHalalas(800), NOW)).toBe('payable')
  })

  it('reads as paid once it has been consumed', () => {
    expect(
      linkState({ ...live, consumedAt: NOW }, riyalsToHalalas(800), NOW),
    ).toBe('paid')
  })

  /** The ruling in MVP.md: a second open shows it paid, it does not charge. */
  it('reads as paid when the debt went another way', () => {
    expect(linkState(live, 0, NOW)).toBe('paid')
  })

  it('runs out on its own date', () => {
    const stale = { ...live, expiresAt: NOW }
    expect(linkState(stale, riyalsToHalalas(800), NOW)).toBe('expired')
  })

  it('will not ask for more than is owed now', () => {
    expect(linkState(live, riyalsToHalalas(500), NOW)).toBe('changed')
  })
})

describe('the link a customer is sent', () => {
  it('points at the page on the origin the merchant is looking at', () => {
    expect(paymentLinkUrl('abc', 'https://sejjel.example')).toBe(
      'https://sejjel.example/r/abc',
    )
  })

  it('opens WhatsApp on a draft to the customer, with the message in it', () => {
    const url = new URL(whatsappUrl('+966500000003', 'مرحبًا\nhttps://x/r/t'))

    expect(url.pathname).toBe('/966500000003')
    expect(url.searchParams.get('text')).toBe('مرحبًا\nhttps://x/r/t')
  })
})

let db: Database
let gateway: ReturnType<typeof createFakePaymentGateway>

beforeEach(async () => {
  db = await createTestDatabase()
  gateway = createFakePaymentGateway()
})

async function accountOwing(riyals = 800) {
  const owner = await makeUser(db)
  const merchant = await makeMerchant(db, {
    ownerUserId: owner.id,
    name: 'بقالة الريان',
    defaultLimitHalalas: riyalsToHalalas(1000),
  })
  const customer = await makeUser(db)
  const connection = await makeConnection(db, {
    merchantId: merchant.id,
    customerUserId: customer.id,
  })
  await makeTransaction(db, {
    connectionId: connection.id,
    amountHalalas: riyalsToHalalas(riyals),
  })
  return { owner, merchant, customer, connection }
}

describe('issuing a link', () => {
  it('asks for the balance, and runs out a week later', async () => {
    const { owner, connection } = await accountOwing()

    const result = await issuePaymentLink(db, {
      connectionId: connection.id,
      merchantUserId: owner.id,
      now: NOW,
    })

    expect(result).toMatchObject({
      ok: true,
      link: {
        amountHalalas: riyalsToHalalas(800),
        expiresAt: linkExpiresAt(NOW),
      },
    })
  })

  it('mints a token nobody would arrive at by trying', async () => {
    const one = await accountOwing()
    const other = await accountOwing()

    const first = await issuePaymentLink(db, {
      connectionId: one.connection.id,
      merchantUserId: one.owner.id,
    })
    const second = await issuePaymentLink(db, {
      connectionId: other.connection.id,
      merchantUserId: other.owner.id,
    })
    if (!first.ok || !second.ok) throw new Error('a link was not issued')

    // Both ends of it: long, and never the same twice.
    expect(first.link.token.length).toBeGreaterThan(20)
    expect(first.link.token).not.toBe(second.link.token)
  })

  it('hands back the same link when the balance has not moved', async () => {
    const { owner, connection } = await accountOwing()
    const issue = () =>
      issuePaymentLink(db, {
        connectionId: connection.id,
        merchantUserId: owner.id,
      })

    const first = await issue()
    const second = await issue()

    expect(first.ok && second.ok && second.link.token).toBe(
      first.ok && first.link.token,
    )
  })

  /**
   * Two live links for one customer would be two pages asking for money, and
   * paying both would take more than is owed. The older one ends here.
   */
  it('ends the link it replaces when the balance has moved', async () => {
    const { owner, connection } = await accountOwing()
    const first = await issuePaymentLink(db, {
      connectionId: connection.id,
      merchantUserId: owner.id,
    })
    await makeTransaction(db, {
      connectionId: connection.id,
      amountHalalas: riyalsToHalalas(200),
    })

    const second = await issuePaymentLink(db, {
      connectionId: connection.id,
      merchantUserId: owner.id,
    })

    expect(second.ok && second.link.amountHalalas).toBe(riyalsToHalalas(1000))
    expect(
      first.ok && (await readPaymentLink(db, first.link.token))?.state,
    ).toBe('expired')
  })

  it('refuses a customer who is not this shop′s', async () => {
    const { connection } = await accountOwing()
    const stranger = await makeUser(db)

    expect(
      await issuePaymentLink(db, {
        connectionId: connection.id,
        merchantUserId: stranger.id,
      }),
    ).toEqual({ ok: false, problem: 'connection' })
  })

  it('has nothing to ask for on a cleared account', async () => {
    const owner = await makeUser(db)
    const merchant = await makeMerchant(db, { ownerUserId: owner.id })
    const connection = await makeConnection(db, { merchantId: merchant.id })

    expect(
      await issuePaymentLink(db, {
        connectionId: connection.id,
        merchantUserId: owner.id,
      }),
    ).toEqual({ ok: false, problem: 'nothing' })
  })
})

describe('the page behind the link', () => {
  it('shows the shop, the amount and the due date, and nothing of the customer', async () => {
    const { owner, connection } = await accountOwing()
    const issued = await issuePaymentLink(db, {
      connectionId: connection.id,
      merchantUserId: owner.id,
    })
    if (!issued.ok) throw new Error('the link was not issued')

    const view = await readPaymentLink(db, issued.link.token)

    expect(view).toMatchObject({
      shopName: 'بقالة الريان',
      amountHalalas: riyalsToHalalas(800),
      state: 'payable',
    })
    expect(JSON.stringify(view)).not.toContain('عميل')
  })

  it('is not there for a token that is not one of ours', async () => {
    expect(await readPaymentLink(db, 'nothing-like-a-token')).toBeNull()
  })
})

describe('paying from the page', () => {
  async function linkFor(riyals = 800) {
    const account = await accountOwing(riyals)
    const issued = await issuePaymentLink(db, {
      connectionId: account.connection.id,
      merchantUserId: account.owner.id,
    })
    if (!issued.ok) throw new Error('the link was not issued')
    return { ...account, token: issued.link.token }
  }

  it('lands on the ledger as a settlement does, and tells the shop', async () => {
    const { owner, customer, connection, token } = await linkFor()

    const result = await payWithLink(db, gateway, { token, method: 'mada' })

    expect(result.ok).toBe(true)
    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(0)

    // The same announcement an in-app payment makes, to both sides.
    const shopSide = await listNotifications(db, owner.id)
    expect(shopSide.at(0)?.kind).toBe('payment_received')
    const customerSide = await listNotifications(db, customer.id)
    expect(customerSide.at(0)?.kind).toBe('payment_received')
  })

  it('is single-use: a second open is shown as paid and charges nothing', async () => {
    const { connection, token } = await linkFor()
    await payWithLink(db, gateway, { token, method: 'mada' })

    const again = await payWithLink(db, gateway, { token, method: 'mada' })

    expect(again).toEqual({ ok: false, problem: 'paid' })
    expect((await readPaymentLink(db, token))?.state).toBe('paid')
    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(0)
  })

  it('carries the receipt the gateway gave, on the page as well', async () => {
    const { token } = await linkFor()

    const result = await payWithLink(db, gateway, { token, method: 'card' })

    expect(result.ok && result.receiptReference).toMatch(/^FAKE-/)
    expect((await readPaymentLink(db, token))?.receiptReference).toBe(
      result.ok ? result.receiptReference : null,
    )
  })

  it('refuses a link that has run out', async () => {
    const { token } = await linkFor()
    await db
      .update(paymentLinks)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(paymentLinks.token, token))

    expect(await payWithLink(db, gateway, { token, method: 'mada' })).toEqual({
      ok: false,
      problem: 'expired',
    })
  })

  it('refuses once the balance has fallen below what it asks for', async () => {
    const { customer, connection, token } = await linkFor()
    // Paid in the app in the meantime, which is the case the page calls
    // "the amount has changed".
    const { startSettlement, confirmSettlement } =
      await import('#/db/queries/settle')
    const started = await startSettlement(db, gateway, {
      connectionId: connection.id,
      customerUserId: customer.id,
      amountHalalas: riyalsToHalalas(300),
      method: 'mada',
      requestId: 'in-the-app',
    })
    if (!started.ok) throw new Error('the in-app payment did not start')
    await confirmSettlement(db, gateway, {
      transactionId: started.transactionId,
      customerUserId: customer.id,
    })

    expect(await payWithLink(db, gateway, { token, method: 'mada' })).toEqual({
      ok: false,
      problem: 'changed',
    })
    expect((await readPaymentLink(db, token))?.state).toBe('changed')
  })

  /** A declined card must leave the link payable, or the debt is stuck. */
  it('leaves the link open when the gateway refuses', async () => {
    const { connection, token } = await linkFor()
    gateway.failNext()

    const refused = await payWithLink(db, gateway, { token, method: 'card' })

    expect(refused).toEqual({ ok: false, problem: 'refused' })
    expect((await readPaymentLink(db, token))?.state).toBe('payable')
    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(riyalsToHalalas(800))

    // And the next attempt goes through.
    expect((await payWithLink(db, gateway, { token, method: 'card' })).ok).toBe(
      true,
    )
  })

  it('is not there for a token that is not one of ours', async () => {
    expect(
      await payWithLink(db, gateway, { token: 'x', method: 'mada' }),
    ).toEqual({ ok: false, problem: 'missing' })
  })
})
