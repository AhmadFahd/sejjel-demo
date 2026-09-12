import { rm } from 'node:fs/promises'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import type { Database } from '#/db/client'
import { transactions } from '#/db/schema'
import {
  describeInvoice,
  readInvoiceFor,
  storeInvoice,
} from '#/db/queries/invoices'
import {
  MAX_INVOICE_BYTES,
  describeInvoiceProblems,
  isPdf,
} from '#/lib/invoice'
import { createTestDatabase } from '../support/database'
import {
  makeConnection,
  makeMerchant,
  makeTransaction,
  makeUser,
} from '../support/factories'

let db: Database

beforeEach(async () => {
  db = await createTestDatabase()
})

afterAll(async () => {
  await rm('./.vitest-storage', { recursive: true, force: true })
})

const aPhotograph = () => new Uint8Array([1, 2, 3, 4])

describe('what an invoice may be', () => {
  it('takes a photograph or a PDF', () => {
    for (const contentType of [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]) {
      expect(describeInvoiceProblems({ contentType, byteSize: 1024 })).toEqual(
        [],
      )
    }
  })

  it('refuses anything else, however small', () => {
    expect(
      describeInvoiceProblems({ contentType: 'video/mp4', byteSize: 10 }),
    ).toEqual(['type'])
  })

  it('refuses a file larger than it will carry, and an empty one', () => {
    expect(
      describeInvoiceProblems({
        contentType: 'image/png',
        byteSize: MAX_INVOICE_BYTES + 1,
      }),
    ).toEqual(['size'])
    expect(
      describeInvoiceProblems({ contentType: 'image/png', byteSize: 0 }),
    ).toEqual(['empty'])
  })

  it('knows a document from a picture, which is how it is drawn', () => {
    expect(isPdf('application/pdf')).toBe(true)
    expect(isPdf('image/png')).toBe(false)
  })
})

describe('storing one', () => {
  it('keeps the bytes and hands back an id', async () => {
    const shopkeeper = await makeUser(db)

    const stored = await storeInvoice(db, {
      body: aPhotograph(),
      contentType: 'image/png',
      fileName: 'receipt.png',
      uploadedByUserId: shopkeeper.id,
    })
    if (!stored.ok) throw new Error('the invoice should have been stored')

    expect(await describeInvoice(db, stored.invoiceId)).toMatchObject({
      contentType: 'image/png',
    })
  })

  it('refuses a file the rules refuse, and stores nothing', async () => {
    const shopkeeper = await makeUser(db)

    const stored = await storeInvoice(db, {
      body: aPhotograph(),
      contentType: 'video/mp4',
      fileName: 'clip.mp4',
      uploadedByUserId: shopkeeper.id,
    })

    expect(stored).toEqual({ ok: false, problems: ['type'] })
  })
})

describe('who may read one', () => {
  /** The two parties to the operation it belongs to, and nobody else. */
  it('gives it to the shop and to the customer, and to no one else', async () => {
    const merchant = await makeMerchant(db)
    const customer = await makeUser(db)
    const stranger = await makeUser(db)
    const connection = await makeConnection(db, {
      merchantId: merchant.id,
      customerUserId: customer.id,
    })

    const stored = await storeInvoice(db, {
      body: aPhotograph(),
      contentType: 'image/png',
      fileName: 'receipt.png',
      uploadedByUserId: merchant.ownerUserId,
    })
    if (!stored.ok) throw new Error('the invoice should have been stored')

    const purchase = await makeTransaction(db, {
      connectionId: connection.id,
    })
    await db
      .update(transactions)
      .set({ invoiceId: stored.invoiceId })
      .where(eq(transactions.id, purchase.id))

    for (const userId of [merchant.ownerUserId, customer.id]) {
      const file = await readInvoiceFor(db, {
        invoiceId: stored.invoiceId,
        userId,
      })
      expect(file?.body).toEqual(aPhotograph())
    }

    expect(
      await readInvoiceFor(db, {
        invoiceId: stored.invoiceId,
        userId: stranger.id,
      }),
    ).toBeNull()
  })

  /** Uploaded but not yet attached: still the uploader's, and nobody's else. */
  it('gives an unattached one to whoever uploaded it', async () => {
    const shopkeeper = await makeUser(db)
    const stranger = await makeUser(db)

    const stored = await storeInvoice(db, {
      body: aPhotograph(),
      contentType: 'image/png',
      fileName: 'receipt.png',
      uploadedByUserId: shopkeeper.id,
    })
    if (!stored.ok) throw new Error('the invoice should have been stored')

    expect(
      await readInvoiceFor(db, {
        invoiceId: stored.invoiceId,
        userId: shopkeeper.id,
      }),
    ).not.toBeNull()
    expect(
      await readInvoiceFor(db, {
        invoiceId: stored.invoiceId,
        userId: stranger.id,
      }),
    ).toBeNull()
  })

  it('gives a guessed id nothing at all', async () => {
    const person = await makeUser(db)

    expect(
      await readInvoiceFor(db, {
        invoiceId: 'no-such-invoice',
        userId: person.id,
      }),
    ).toBeNull()
  })
})
