/**
 * UC-11: what an invoice may be. A phone's camera and a shop's printer
 * between them produce photographs and PDFs, and nothing else is worth
 * accepting: the file is shown to two people and stored for both.
 */

export const INVOICE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export type InvoiceType = (typeof INVOICE_TYPES)[number]

/** A photograph off a modern phone fits; a video does not, which is the point. */
export const MAX_INVOICE_BYTES = 5 * 1024 * 1024

export type InvoiceProblem = 'type' | 'size' | 'empty'

export function describeInvoiceProblems(file: {
  contentType: string
  byteSize: number
}): Array<InvoiceProblem> {
  const problems: Array<InvoiceProblem> = []

  if (!isInvoiceType(file.contentType)) problems.push('type')
  if (file.byteSize <= 0) problems.push('empty')
  else if (file.byteSize > MAX_INVOICE_BYTES) problems.push('size')

  return problems
}

export function isInvoiceType(value: string): value is InvoiceType {
  return (INVOICE_TYPES as ReadonlyArray<string>).includes(value)
}

/** What the viewer draws it with: a picture, or a page of a document. */
export function isPdf(contentType: string) {
  return contentType === 'application/pdf'
}
