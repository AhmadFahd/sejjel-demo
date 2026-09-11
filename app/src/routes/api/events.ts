import { createFileRoute } from '@tanstack/react-router'

/** How often a stream says something, so a proxy does not close it as idle. */
const HEARTBEAT_MS = 20_000

/**
 * A slow sweep behind the wake, for the case where a signal is missed: the
 * table is the truth, and this is how a quiet stream still catches up.
 */
const SWEEP_MS = 15_000

/**
 * #14: the event stream, one per signed-in user. An event names what changed;
 * the client re-fetches. Nothing here carries a balance, so a replayed event
 * cannot put a wrong number on a screen.
 */
export const Route = createFileRoute('/api/events')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { readSignedInUser } = await import('#/auth/session.server')
        const { getDatabase } = await import('#/db/client')
        const { eventsSince, latestEventId } =
          await import('#/db/queries/events')
        const { onWake } = await import('#/server/stream.server')

        const user = await readSignedInUser()
        if (!user) return new Response('Unauthorized', { status: 401 })

        const db = getDatabase()
        const resumeFrom = Number(request.headers.get('last-event-id'))
        // A client that has heard nothing starts from now: the events before
        // it signed in are not news, and its first fetch already has them.
        let cursor =
          Number.isInteger(resumeFrom) && resumeFrom > 0
            ? resumeFrom
            : await latestEventId(db, user.id)

        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          async start(controller) {
            let open = true
            const send = (text: string) => {
              if (open) controller.enqueue(encoder.encode(text))
            }

            const flush = async () => {
              const pending = await eventsSince(db, user.id, cursor)
              for (const event of pending) {
                cursor = event.id
                send(
                  `id: ${event.id}\nevent: ${event.kind}\n` +
                    `data: ${JSON.stringify({ subjectId: event.subjectId })}\n\n`,
                )
              }
            }

            // The reconnection delay the browser should use, and an opening
            // flush so a client that missed events while away has them at once.
            send('retry: 3000\n\n')
            await flush()

            const stopWaking = onWake(user.id, () => {
              void flush()
            })
            const sweep = setInterval(() => void flush(), SWEEP_MS)
            const heartbeat = setInterval(
              () => send(': keep-alive\n\n'),
              HEARTBEAT_MS,
            )

            const close = () => {
              if (!open) return
              open = false
              stopWaking()
              clearInterval(sweep)
              clearInterval(heartbeat)
              try {
                controller.close()
              } catch {
                // The client hung up first, which is the ordinary way a stream
                // ends: nothing to do but stop writing to it.
              }
            }

            request.signal.addEventListener('abort', close)
          },
        })

        return new Response(stream, {
          headers: {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache, no-transform',
            connection: 'keep-alive',
            // Whatever sits in front of this must not buffer a stream.
            'x-accel-buffering': 'no',
          },
        })
      },
    },
  },
})
