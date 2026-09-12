import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { applyScannedCode } from '#/auth/approval'
import { requireSide } from '#/auth/enter'
import { Button, buttonClass } from '#/components/chrome'
import { Card } from '#/components/primitives'
import { useI18n } from '#/i18n/context'
import { SETTLED } from '#/lib/freshness'
import { NOTHING_MOVES_IT } from '#/lib/moves'

/**
 * The browser's own QR reader where there is one. Chromium has it; a browser
 * without it gets the typed code instead of a broken camera.
 */
type Detector = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
}

function makeDetector(): Detector | null {
  const available = (
    globalThis as unknown as {
      BarcodeDetector?: new (options: { formats: Array<string> }) => Detector
    }
  ).BarcodeDetector
  if (!available) return null
  return new available({ formats: ['qr_code'] })
}

type Problem =
  | 'shape'
  | 'signature'
  | 'expired'
  | 'elsewhere'
  | 'already'
  | 'gone'
  | 'self'
  | 'limit'

/** What the scan turned out to be, once the server read the code. */
type Outcome =
  | { kind: 'applied' }
  | { kind: 'asked' }
  | { kind: 'connected'; connectionId: string }

/** UC-07: the merchant's scan is what applies the operation. */
export const Route = createFileRoute('/merchant/scan')({
  ...SETTLED,
  // #89: nothing to read, so nothing to re-read.
  staticData: NOTHING_MOVES_IT,
  // Nothing to read for this screen, so the loader exists for the guard
  // alone: it waits on the side's own read rather than asking again.
  loader: ({ parentMatchPromise }) =>
    requireSide(parentMatchPromise, 'merchant'),
  component: ScanCode,
})

function ScanCode() {
  const { t } = useI18n()
  const origin =
    typeof window === 'undefined' ? 'sejjel' : window.location.origin
  const router = useRouter()
  const video = useRef<HTMLVideoElement>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [camera, setCamera] = useState<'idle' | 'on' | 'unavailable'>('idle')

  const apply = useCallback(
    async (code: string) => {
      if (!code.trim() || busy) return
      setBusy(true)
      const result = await applyScannedCode({ data: { code: code.trim() } })
      setBusy(false)

      if (result.outcome === 'refused') {
        setProblem(result.problem)
        return
      }

      setProblem(null)
      setOutcome(
        result.outcome === 'connected'
          ? { kind: 'connected', connectionId: result.connectionId }
          : { kind: result.outcome },
      )
      await router.invalidate()
    },
    [busy, router],
  )

  // The camera, where the device and the browser both allow one. A phone that
  // refuses is not stuck: the code under the QR can be typed instead.
  useEffect(() => {
    if (outcome) return

    const detector = makeDetector()
    if (!detector) {
      setCamera('unavailable')
      return
    }

    let stream: MediaStream | null = null
    let stopped = false

    const look = async () => {
      const element = video.current
      // A video that has not decoded a frame yet has nothing to read.
      if (stopped || !element || element.readyState < 2) return
      try {
        const found = (await detector.detect(element)).at(0)
        if (found) await apply(found.rawValue)
      } catch {
        // A frame that could not be read is not worth saying anything about:
        // the next one is a fifth of a second away.
      }
    }

    const timer = setInterval(() => void look(), 200)

    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((granted) => {
        stream = granted
        if (video.current) {
          video.current.srcObject = granted
          void video.current.play()
        }
        setCamera('on')
      })
      .catch(() => setCamera('unavailable'))

    return () => {
      stopped = true
      clearInterval(timer)
      for (const track of stream?.getTracks() ?? []) track.stop()
    }
  }, [outcome, apply])

  return (
    <>
      <main className="p-3.5">
        <Link
          to="/merchant"
          className="mb-3 inline-block text-[13px] font-black text-brand"
        >
          {t('nav.back')}
        </Link>
        <h1 className="mb-3 text-xl font-black text-ink">{t('scan.title')}</h1>

        {outcome ? (
          <Card
            data-testid={
              outcome.kind === 'applied' ? 'applied' : 'connect-outcome'
            }
          >
            <p className="mb-3 text-[15px] font-black text-good-text">
              {t(
                outcome.kind === 'applied'
                  ? 'scan.applied'
                  : outcome.kind === 'asked'
                    ? 'scan.asked'
                    : 'scan.connected',
              )}
            </p>
            {outcome.kind === 'connected' ? (
              <Link
                to="/merchant/record"
                search={{ customer: outcome.connectionId }}
                className={buttonClass('primary')}
                data-testid="record-for-them"
              >
                {t('operation.new')}
              </Link>
            ) : null}
          </Card>
        ) : (
          <Card>
            <p className="mb-3 text-[13px] font-bold text-muted">
              {camera === 'unavailable' ? t('scan.noCamera') : t('scan.body')}
            </p>

            {camera === 'unavailable' ? null : (
              <video
                ref={video}
                muted
                playsInline
                data-testid="scanner"
                className="mb-3 w-full rounded-(--radius-control) bg-brand/10"
              />
            )}

            <label
              className="mb-1 block text-[12.5px] font-bold text-muted"
              htmlFor="scan-code"
            >
              {t('scan.manual')}
            </label>
            <input
              id="scan-code"
              dir="ltr"
              className="mb-3 w-full rounded-(--radius-control) border border-neutral-bg px-3 py-3 text-[12px]"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
            <Button tone="primary" disabled={busy} onClick={() => apply(typed)}>
              {t('scan.apply')}
            </Button>

            {/* UC-08: somebody who has never used سجّل has no card to scan.
                Nothing goes on the ledger for them until they sign up and
                agree, so all the shop can do is point them at it. */}
            <p className="mt-4 text-[11.5px] font-bold text-muted">
              {t('scan.invite')}{' '}
              <span dir="ltr" className="font-black text-brand">
                {origin}
              </span>
            </p>
          </Card>
        )}

        {problem ? (
          <p
            role="alert"
            className="mt-3 text-[12.5px] font-bold text-bad-text"
          >
            {t(`scan.error.${problem}`)}
          </p>
        ) : null}
      </main>
    </>
  )
}
