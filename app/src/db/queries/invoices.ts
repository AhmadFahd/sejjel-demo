import { eq } from 'drizzle-orm'
import { connections, invoices, merchants, transactions } from '../schema'
import { describeInvoiceProblems } from '#/lib/invoice'
import type { Database } from '../client'
import type { InvoiceProblem } from '#/lib/invoice'

/**
 * UC-11: the invoice behind an operation, so a disagreement about what was
 * bought has an answer. The bytes go to the storage interface from #18; the
 * row here holds what the app needs to know about them.
 */

export type StoreResult =
  | { ok: true; invoiceId: string }
  | { ok: false; problems: Array<InvoiceProblem> }

export async function storeInvoice(
  db: Database,
  input: {
    body: Uint8Array
    contentType: string
    fileName: string
    uploadedByUserId: string
  },
): Promise<StoreResult> {
  const problems = describeInvoiceProblems({
    contentType: input.contentType,
    byteSize: input.body.byteLength,
  })
  if (problems.length > 0) return { ok: false, problems }

  const { getProviders } = await import('#/providers/registry')
  const stored = await getProviders().storage.put({
    body: input.body,
    contentType: input.contentType,
    fileName: input.fileName,
  })

  const [row] = await db
    .insert(invoices)
    .values({
      storageKey: stored.key,
      contentType: stored.contentType,
      byteSize: stored.byteSize,
      uploadedByUserId: input.uploadedByUserId,
    })
    .returning()

  return { ok: true, invoiceId: row.id }
}

export type InvoiceFile = {
  invoiceId: string
  contentType: string
  byteSize: number
  body: Uint8Array
}

/**
 * Only the two parties to the operation it belongs to, which is the whole
 * answer a guessed id gets. An invoice not yet on an operation belongs to
 * whoever uploaded it and nobody else.
 */
export async function readInvoiceFor(
  db: Database,
  input: { invoiceId: string; userId: string },
): Promise<InvoiceFile | null> {
  const rows = await db
    .select({
      invoice: invoices,
      connection: connections,
      merchant: merchants,
    })
    .from(invoices)
    .leftJoin(transactions, eq(transactions.invoiceId, invoices.id))
    .leftJoin(connections, eq(connections.id, transactions.connectionId))
    .leftJoin(merchants, eq(merchants.id, connections.merchantId))
    .where(eq(invoices.id, input.invoiceId))

  const row = rows.at(0)
  if (!row) return null

  const parties = [
    row.invoice.uploadedByUserId,
    row.connection?.customerUserId,
    row.merchant?.ownerUserId,
  ]
  if (!parties.includes(input.userId)) return null

  const { getProviders } = await import('#/providers/registry')
  const body = await getProviders().storage.read(row.invoice.storageKey)
  if (!body) return null

  return {
    invoiceId: row.invoice.id,
    contentType: row.invoice.contentType,
    byteSize: row.invoice.byteSize,
    body,
  }
}

/** What a screen needs to draw a link to it, without fetching the bytes. */
export async function describeInvoice(db: Database, invoiceId: string) {
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
  const row = rows.at(0)
  return row ? { invoiceId: row.id, contentType: row.contentType } : null
}
