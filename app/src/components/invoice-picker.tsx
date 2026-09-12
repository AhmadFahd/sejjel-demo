import { useRef, useState } from 'react'
import { Button } from './chrome'
import { cx } from './primitives'
import { INVOICE_TYPES, describeInvoiceProblems } from '#/lib/invoice'
import { useI18n } from '#/i18n/context'
import type { InvoiceProblem } from '#/lib/invoice'

export type PickedInvoice = { invoiceId: string; name: string }

/**
 * UC-11: the invoice, from the camera or from the files on the phone. It is
 * uploaded as it is picked rather than with the operation, so the shopkeeper
 * finds out it is too big while they are still looking at the counter, not
 * after pressing send.
 */
export function InvoicePicker({
  picked,
  onPicked,
}: {
  picked: PickedInvoice | null
  onPicked: (invoice: PickedInvoice | null) => void
}) {
  const { t } = useI18n()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [problems, setProblems] = useState<Array<InvoiceProblem>>([])

  const take = async (file: File | undefined) => {
    if (!file) return
    setProblems([])

    // Checked here as well as on the server: a file the phone can see is too
    // big should not be sent over a shop's connection to be told so.
    const local = describeInvoiceProblems({
      contentType: file.type,
      byteSize: file.size,
    })
    if (local.length > 0) {
      setProblems(local)
      return
    }

    setBusy(true)
    const body = new FormData()
    body.append('file', file)
    const response = await fetch('/api/invoices', { method: 'POST', body })
    const answer = (await response.json()) as {
      invoiceId?: string
      problems?: Array<InvoiceProblem>
    }
    setBusy(false)

    if (!answer.invoiceId) {
      setProblems(answer.problems ?? ['type'])
      return
    }
    onPicked({ invoiceId: answer.invoiceId, name: file.name })
  }

  return (
    <div className="mt-3" data-testid="invoice-picker">
      <span className="mb-1 block text-[12.5px] font-extrabold text-muted">
        {t('invoice.label')}
      </span>

      <input
        ref={input}
        type="file"
        accept={INVOICE_TYPES.join(',')}
        capture="environment"
        className="hidden"
        data-testid="invoice-file"
        onChange={(event) => void take(event.target.files?.[0])}
      />

      {picked ? (
        <div
          className={cx(
            'flex items-center justify-between gap-2 rounded-(--radius-control) bg-neutral-bg px-3 py-2.5',
          )}
          data-testid="invoice-picked"
        >
          <span className="truncate text-[12.5px] font-bold text-ink">
            {picked.name}
          </span>
          <button
            type="button"
            className="text-[12px] font-black text-bad-text"
            data-testid="invoice-clear"
            onClick={() => onPicked(null)}
          >
            {t('invoice.clear')}
          </button>
        </div>
      ) : (
        <Button
          tone="ghost"
          disabled={busy}
          data-testid="invoice-pick"
          onClick={() => input.current?.click()}
        >
          {t('invoice.attach')}
        </Button>
      )}

      {problems.length > 0 ? (
        <ul role="alert" className="mt-2 space-y-1">
          {problems.map((problem) => (
            <li
              key={problem}
              className="text-[12px] font-extrabold text-bad-text"
            >
              {t(`invoice.error.${problem}`)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
