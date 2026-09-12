import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireSignedIn } from '#/auth/guard'
import { isPdf } from '#/lib/invoice'
import { Card } from '#/components/primitives'
import { useI18n } from '#/i18n/context'

const loadInvoice = createServerFn({ method: 'GET' })
  .validator((input: unknown): { invoiceId: string } => ({
    invoiceId: String((input as { invoiceId?: unknown }).invoiceId ?? ''),
  }))
  .handler(async ({ data }) => {
    const { requireSignedInUser } = await import('#/auth/session.server')
    const { getDatabase } = await import('#/db/client')
    const { readInvoiceFor } = await import('#/db/queries/invoices')
    const user = await requireSignedInUser()

    // The same check the bytes go through, so a screen is never drawn for a
    // file its reader is not going to be given.
    const file = await readInvoiceFor(getDatabase(), {
      invoiceId: data.invoiceId,
      userId: user.id,
    })
    return file
      ? { invoiceId: file.invoiceId, contentType: file.contentType }
      : null
  })

/** UC-11: the invoice, full screen, for either party to the operation. */
export const Route = createFileRoute('/invoice/$invoiceId')({
  beforeLoad: () => requireSignedIn(),
  loader: async ({ params }) => {
    const invoice = await loadInvoice({
      data: { invoiceId: params.invoiceId },
    })
    if (!invoice) throw notFound()
    return invoice
  },
  component: InvoiceView,
})

function InvoiceView() {
  const invoice = Route.useLoaderData()
  const { t } = useI18n()
  const src = `/api/invoices/${invoice.invoiceId}`

  return (
    <main className="p-3.5">
      <Link
        to="/"
        className="mb-3 inline-block text-[13px] font-black text-steel"
      >
        {t('nav.back')}
      </Link>
      <h1 className="mb-3 text-xl font-black text-ink">{t('invoice.title')}</h1>

      <Card className="p-2">
        {isPdf(invoice.contentType) ? (
          <object
            data={src}
            type={invoice.contentType}
            className="h-[70dvh] w-full rounded-(--radius-control)"
            data-testid="invoice-pdf"
          >
            <a href={src} className="text-[13px] font-black text-steel">
              {t('invoice.open')}
            </a>
          </object>
        ) : (
          <img
            src={src}
            alt={t('invoice.title')}
            data-testid="invoice-image"
            className="w-full rounded-(--radius-control)"
          />
        )}
      </Card>
    </main>
  )
}
