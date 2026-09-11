import { beforeEach, describe, expect, it } from 'vitest'
import type { Database } from '#/db/client'
import {
  APPROVAL_SECONDS,
  issueApproval,
  readApproval,
} from '#/lib/approval.server'
import {
  acceptTerms,
  applyApproval,
  approveOperation,
  declineOperation,
  readPendingOperation,
} from '#/db/queries/approval'
import { recordPendingPurchase } from '#/db/queries/purchases'
import { getConnectionSummary } from '#/db/queries/ledger'
import { eventsSince } from '#/db/queries/events'
import { riyalsToHalalas } from '#/lib/money'
import { createTestDatabase } from '../support/database'
import {
  makeConnection,
  makeMerchant,
  makeTransaction,
  makeUser,
} from '../support/factories'

const issued = { transactionId: 'tx-1', merchantId: 'shop-1' }

describe('an approval code', () => {
  it('reads back what was signed into it', () => {
    const now = new Date('2026-09-15T10:00:00Z')
    const check = readApproval(issueApproval(issued, now), now)

    expect(check).toMatchObject({ ok: true })
    if (check.ok) {
      expect(check.approval.transactionId).toBe('tx-1')
      expect(check.approval.merchantId).toBe('shop-1')
    }
  })

  it('is two different codes for the same operation', () => {
    expect(issueApproval(issued)).not.toBe(issueApproval(issued))
  })

  it('runs out two minutes on', () => {
    const now = new Date('2026-09-15T10:00:00Z')
    const code = issueApproval(issued, now)
    const justBefore = new Date(now.getTime() + (APPROVAL_SECONDS - 1) * 1000)
    const justAfter = new Date(now.getTime() + (APPROVAL_SECONDS + 1) * 1000)

    expect(readApproval(code, justBefore)).toMatchObject({ ok: true })
    expect(readApproval(code, justAfter)).toEqual({
      ok: false,
      problem: 'expired',
    })
  })

  it('refuses a body somebody edited', () => {
    const code = issueApproval(issued)
    const [body, signature] = code.split('.')
    const tampered = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body, 'base64url').toString('utf8')),
        transactionId: 'someone-elses',
      }),
    ).toString('base64url')

    expect(readApproval(`${tampered}.${signature}`)).toEqual({
      ok: false,
      problem: 'signature',
    })
  })

  it.each([['not-a-code'], [''], ['a.b']])('refuses %s', (code) => {
    expect(readApproval(code).ok).toBe(false)
  })
})

let db: Database

beforeEach(async () => {
  db = await createTestDatabase()
})

async function pendingOperation(
  options: { termsAcceptedAt?: Date | null } = {},
) {
  const owner = await makeUser(db)
  const merchant = await makeMerchant(db, {
    ownerUserId: owner.id,
    defaultLimitHalalas: riyalsToHalalas(1000),
  })
  const customer = await makeUser(db)
  const connection = await makeConnection(db, {
    merchantId: merchant.id,
    customerUserId: customer.id,
    termsAcceptedAt:
      options.termsAcceptedAt === undefined
        ? new Date()
        : options.termsAcceptedAt,
  })
  const recorded = await recordPendingPurchase(db, {
    connectionId: connection.id,
    merchantId: merchant.id,
    amountHalalas: riyalsToHalalas(250),
    description: 'مشتريات',
    requestId: `request-${connection.id}`,
  })
  if (!recorded.ok) throw new Error('the purchase was refused')

  return {
    owner,
    merchant,
    customer,
    connection,
    transactionId: recorded.transactionId,
  }
}

describe('approving', () => {
  it('shows the customer what they are agreeing to', async () => {
    const { transactionId } = await pendingOperation()

    const operation = await readPendingOperation(db, transactionId)

    expect(operation?.amountHalalas).toBe(riyalsToHalalas(250))
    expect(operation?.description).toBe('مشتريات')
    expect(operation?.termsAccepted).toBe(true)
  })

  it('asks for the terms first, once', async () => {
    const { transactionId, connection, customer } = await pendingOperation({
      termsAcceptedAt: null,
    })

    expect(
      await approveOperation(db, {
        transactionId,
        customerUserId: customer.id,
      }),
    ).toEqual({ ok: false, problem: 'terms' })

    await acceptTerms(db, {
      connectionId: connection.id,
      customerUserId: customer.id,
    })

    expect(
      await approveOperation(db, {
        transactionId,
        customerUserId: customer.id,
      }),
    ).toMatchObject({ ok: true })
  })

  it('is nobody else’s to approve', async () => {
    const { transactionId } = await pendingOperation()
    const stranger = await makeUser(db)

    expect(
      await approveOperation(db, {
        transactionId,
        customerUserId: stranger.id,
      }),
    ).toEqual({ ok: false, problem: 'missing' })
  })

  it('moves nothing on the ledger by itself', async () => {
    const { transactionId, customer, connection } = await pendingOperation()

    await approveOperation(db, { transactionId, customerUserId: customer.id })

    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(0)
  })
})

describe('declining', () => {
  it('calls the operation off and tells the shop', async () => {
    const { transactionId, customer, owner, connection } =
      await pendingOperation()

    expect(
      await declineOperation(db, {
        transactionId,
        customerUserId: customer.id,
      }),
    ).toBe(true)

    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(0)
    const events = await eventsSince(db, owner.id, 0)
    expect(events.at(-1)?.kind).toBe('purchase.cancelled')
  })
})

describe('applying a scanned code', () => {
  it('puts the purchase on the ledger, once', async () => {
    const { transactionId, merchant, customer, owner, connection } =
      await pendingOperation()
    const approval = await approveOperation(db, {
      transactionId,
      customerUserId: customer.id,
    })
    if (!approval.ok) throw new Error('the approval was refused')

    const first = await applyApproval(db, {
      code: approval.code,
      merchantId: merchant.id,
    })
    const again = await applyApproval(db, {
      code: approval.code,
      merchantId: merchant.id,
    })

    expect(first).toMatchObject({ ok: true, repeated: false })
    expect(again).toMatchObject({ ok: true, repeated: true, transactionId })

    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(riyalsToHalalas(250))
    expect(summary?.purchases).toBe(1)

    // Both phones hear about it, so neither screen has to be refreshed.
    for (const userId of [customer.id, owner.id]) {
      const events = await eventsSince(db, userId, 0)
      expect(events.some((event) => event.kind === 'purchase.applied')).toBe(
        true,
      )
    }
  })

  it('is refused when another operation has taken the room since', async () => {
    const { transactionId, merchant, customer, connection } =
      await pendingOperation()
    const approval = await approveOperation(db, {
      transactionId,
      customerUserId: customer.id,
    })
    if (!approval.ok) throw new Error('the approval was refused')

    // 250 was fine when it was entered. 900 lands in between, and the limit
    // is 1,000: the scan has to check again rather than trust the entry.
    await makeTransaction(db, {
      connectionId: connection.id,
      amountHalalas: riyalsToHalalas(900),
    })

    expect(
      await applyApproval(db, {
        code: approval.code,
        merchantId: merchant.id,
      }),
    ).toEqual({ ok: false, problem: 'limit' })

    const summary = await getConnectionSummary(db, connection.id)
    expect(summary?.balanceHalalas).toBe(riyalsToHalalas(900))
  })

  it('is refused by the shop next door', async () => {
    const { transactionId, customer } = await pendingOperation()
    const someoneElse = await makeMerchant(db)
    const approval = await approveOperation(db, {
      transactionId,
      customerUserId: customer.id,
    })
    if (!approval.ok) throw new Error('the approval was refused')

    expect(
      await applyApproval(db, {
        code: approval.code,
        merchantId: someoneElse.id,
      }),
    ).toEqual({ ok: false, problem: 'elsewhere' })
  })

  it('is refused once it has run out', async () => {
    const { transactionId, merchant, customer } = await pendingOperation()
    const now = new Date()
    const approval = await approveOperation(db, {
      transactionId,
      customerUserId: customer.id,
      now,
    })
    if (!approval.ok) throw new Error('the approval was refused')

    expect(
      await applyApproval(db, {
        code: approval.code,
        merchantId: merchant.id,
        now: new Date(now.getTime() + (APPROVAL_SECONDS + 1) * 1000),
      }),
    ).toEqual({ ok: false, problem: 'expired' })
  })

  it('refuses a second code for an operation already applied', async () => {
    const { transactionId, merchant, customer } = await pendingOperation()
    const first = await approveOperation(db, {
      transactionId,
      customerUserId: customer.id,
    })
    const second = await approveOperation(db, {
      transactionId,
      customerUserId: customer.id,
    })
    if (!first.ok || !second.ok) throw new Error('the approval was refused')

    await applyApproval(db, { code: first.code, merchantId: merchant.id })

    expect(
      await applyApproval(db, { code: second.code, merchantId: merchant.id }),
    ).toEqual({ ok: false, problem: 'already' })
  })
})
