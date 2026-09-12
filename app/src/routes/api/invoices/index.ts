import { createFileRoute } from '@tanstack/react-router'

/**
 * UC-11: where the file itself is posted. A form upload rather than a server
 * function, because what goes over the wire here is bytes and nothing else.
 */
export const Route = createFileRoute('/api/invoices/')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { readSignedInUser } = await import('#/auth/session.server')
        const { getDatabase } = await import('#/db/client')
        const { storeInvoice } = await import('#/db/queries/invoices')
        const { MAX_INVOICE_BYTES } = await import('#/lib/invoice')

        const user = await readSignedInUser()
        if (!user) return new Response('Unauthorized', { status: 401 })

        const form = await request.formData()
        const file = form.get('file')
        if (!(file instanceof File)) {
          return Response.json({ problems: ['empty'] }, { status: 400 })
        }

        // The size is refused before the bytes are read into memory, so a
        // file far too big costs a header rather than a gigabyte.
        if (file.size > MAX_INVOICE_BYTES) {
          return Response.json({ problems: ['size'] }, { status: 413 })
        }

        const result = await storeInvoice(getDatabase(), {
          body: new Uint8Array(await file.arrayBuffer()),
          contentType: file.type,
          fileName: file.name,
          uploadedByUserId: user.id,
        })

        return result.ok
          ? Response.json({ invoiceId: result.invoiceId })
          : Response.json({ problems: result.problems }, { status: 400 })
      },
    },
  },
})
