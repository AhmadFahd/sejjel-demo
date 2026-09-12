import { createFileRoute } from '@tanstack/react-router'

/**
 * UC-11: the bytes back out, to the two parties to the operation and nobody
 * else. A guessed id gets the same answer as one that does not exist.
 */
export const Route = createFileRoute('/api/invoices/$invoiceId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { readSignedInUser } = await import('#/auth/session.server')
        const { getDatabase } = await import('#/db/client')
        const { readInvoiceFor } = await import('#/db/queries/invoices')

        const user = await readSignedInUser()
        if (!user) return new Response('Not found', { status: 404 })

        const file = await readInvoiceFor(getDatabase(), {
          invoiceId: params.invoiceId,
          userId: user.id,
        })
        if (!file) return new Response('Not found', { status: 404 })

        // A fresh buffer, so the response body is one this runtime's types
        // agree is a body rather than a view onto something larger.
        return new Response(file.body.slice().buffer, {
          headers: {
            'content-type': file.contentType,
            'content-length': String(file.byteSize),
            // Somebody else's phone must not be shown this out of a cache.
            'cache-control': 'private, max-age=0, no-store',
          },
        })
      },
    },
  },
})
