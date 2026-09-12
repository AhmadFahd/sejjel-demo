import { useRouter } from '@tanstack/react-router'
import { setHideAmounts } from '#/auth/shell'
import { useViewer } from '#/auth/viewer'
import { cx } from './primitives'
import { useI18n } from '#/i18n/context'

const EYE = 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z'
const PUPIL = { cx: 12, cy: 12, r: 3 }
const STRUCK = [
  'M4 4l16 16',
  'M9.6 9.6a3 3 0 0 0 4.2 4.2',
  'M6.6 6.7C3.9 8.4 2 12 2 12s3.6 6.5 10 6.5c1.8 0 3.4-.5 4.7-1.2',
  'M19.4 15.7C21.1 14.2 22 12 22 12s-3.6-6.5-10-6.5c-.9 0-1.7.1-2.5.3',
]

/**
 * UC-14: one tap puts every figure behind dots, so the person at the counter
 * beside you cannot read your balance over your shoulder. It rides in the
 * dock beside the person, where the app keeps its controls, and stays one
 * press rather than a row inside a menu — the point of it is speed.
 *
 * The choice is stored on the person's row, so the screen comes back the way
 * they left it. Nothing about what the server sends changes; the amounts are
 * there, and the formatter draws dots instead.
 */
export function AmountsEye() {
  const { t, amountsHidden } = useI18n()
  const { signedIn } = useViewer()
  const router = useRouter()
  if (!signedIn) return null

  // The label says what the press will do, not what the state is: the state
  // is carried by aria-pressed, and a button that names its own state reads
  // as an instruction to a screen reader.
  const label = amountsHidden ? t('amounts.show') : t('amounts.hide')

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={amountsHidden}
      data-testid="amounts-eye"
      className={cx(
        'flex items-center rounded-full px-3 py-2 transition lg:px-4',
        amountsHidden ? 'bg-brand text-white' : 'text-muted',
      )}
      onClick={async () => {
        await setHideAmounts({ data: !amountsHidden })
        await router.invalidate()
      }}
    >
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {amountsHidden ? (
          STRUCK.map((d) => <path key={d} d={d} />)
        ) : (
          <>
            <path d={EYE} />
            <circle {...PUPIL} />
          </>
        )}
      </svg>
    </button>
  )
}
