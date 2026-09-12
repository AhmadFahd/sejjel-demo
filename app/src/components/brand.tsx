import { useId } from 'react'
import { cx } from './primitives'

/**
 * The identity's drawn parts, as components: the wordmark, the icon, and the
 * texture derived from the icon. Every path here is copied from the source SVGs
 * (`logo.svg`, `icon.svg`) which `brand/identity-ar.html` specifies as the only
 * permitted origin — the mark is never redrawn and never traced from a
 * screenshot.
 *
 * The rules the components enforce, so a screen cannot break them by accident:
 * the icon's two elements always appear together, the letters keep their own
 * colour, and on the green ground the whole logo goes to one bone colour
 * because green over green disappears.
 */

/** The letters. */
const WORD = '#5c4f4a'
/** The check, its dot, and its shadda. */
const GREEN = '#5c766d'
/** The ground. */
const BONE = '#ede9e6'

/** The check and its dot, on their own. Everything else here reuses them. */
const MARK_CHECK =
  'M 595.96 374.06 A 2 2 0 0 1 593.32 374.18 L 515.48 311.58 A 18.8 18.8 0 0 0 488.95 337.89 L 576.71 448.89 A 24.2 24.2 0 0 0 614.4 449.23 L 826.47 190.61 A 14.2 14.2 0 0 0 805.62 171.39 Z'

export type BrandTone =
  /** Letters brown, mark green. The only full-colour pairing, on bone. */
  | 'duo'
  /** All one bone colour, for the green ground. */
  | 'bone'
  /** All one green colour, for a single-colour print. */
  | 'green'

const WORDMARK_COLORS: Record<BrandTone, { word: string; mark: string }> = {
  duo: { word: WORD, mark: GREEN },
  bone: { word: BONE, mark: BONE },
  green: { word: GREEN, mark: GREEN },
}

/**
 * The full logo — the primary use, for any space more than twice as wide as it
 * is tall. Never narrower than 120px on a screen.
 */
export function Wordmark({
  tone = 'duo',
  className,
  title,
}: {
  tone?: BrandTone
  className?: string
  title: string
}) {
  const colors = WORDMARK_COLORS[tone]

  return (
    <svg
      viewBox="0 0 1290 572"
      role="img"
      aria-label={title}
      className={cx('h-auto min-w-[120px]', className)}
    >
      <g fill={colors.word}>
        <path d="M 276.83 136.27 A 3 3 0 0 1 281 139.03 V 348 A 35 35 0 0 0 316 383 H 432.21 A 20 20 0 0 1 447.9 390.6 L 483 435 H 279.42 A 87 87 0 0 1 193 512 H 102 A 87 87 0 0 1 15 425 V 369.65 A 38 38 0 0 1 38.15 334.67 L 63.83 323.77 A 3 3 0 0 1 68 326.53 V 419 A 42 42 0 0 0 110 461 H 184 A 42 42 0 0 0 226 419 V 179.03 A 32 32 0 0 1 245.5 149.57 Z" />
        <path d="M 725 435 L 761.64 390.32 A 20 20 0 0 1 777.1 383 H 906 A 27 27 0 0 0 933 356 V 322.33 A 32 32 0 0 1 952.5 292.87 L 979.83 281.27 A 3 3 0 0 1 984 284.03 V 356 A 27 27 0 0 0 1011 383 H 1046 A 27 27 0 0 0 1073 356 V 322.33 A 32 32 0 0 1 1092.5 292.87 L 1119.83 281.27 A 3 3 0 0 1 1124 284.03 V 356 A 27 27 0 0 0 1151 383 H 1187 A 27 27 0 0 0 1214 356 V 322.33 A 32 32 0 0 1 1233.5 292.87 L 1260.83 281.27 A 3 3 0 0 1 1265 284.03 V 363 A 72 72 0 0 1 1193 435 H 1145 A 72 72 0 0 1 1098.5 417.97 A 72 72 0 0 1 1052 435 H 1005 A 72 72 0 0 1 958.5 417.97 A 72 72 0 0 1 912 435 Z" />
      </g>
      <g
        fill={colors.mark}
        transform="matrix(0,-0.99999869,0.9999992,0,238.18056,944.80857)"
      >
        <path d="m 830.11503,381.69437 1.57,-7.24 a 13.000007,12.999993 0 0 0 -12.7,-15.75999 h -18.37001 a 22.000011,21.999989 0 0 0 -22.00001,21.99999 v 2.4 a 22.000011,21.999989 0 0 0 5.94,15.03999 19.00001,18.99999 0 0 0 -14.94001,18.55999 v 5 a 19.00001,18.99999 0 0 0 19.00001,18.99999 h 20.56001 a 5.0000026,4.9999974 0 0 0 4.96001,-4.41 l 1.85,-15.46999 a 1.0000005,0.99999949 0 0 0 -1,-1.12 h -18.37001 a 5.5000028,5.4999972 0 0 1 -5.50001,-5.5 5.5000028,5.4999972 0 0 1 5.50001,-5.49999 h 23.75001 a 1.0000005,0.99999949 0 0 0 0.96,-0.73 l 4.43,-15.49999 a 1.0000005,0.99999949 0 0 0 -0.97,-1.27 h -19.92001 a 4.7500024,4.7499976 0 0 1 -4.75,-4.75 4.7500024,4.7499976 0 0 1 4.75,-4.75 z" />
        <path d="m 595.77428,403.49036 a 2.0000002,1.9999998 38.944008 0 1 -2.56039,0.65458 l -88.94742,-45.4553 a 18.800001,18.799999 39.764158 0 0 -20.62273,31.15701 l 108.50637,90.82504 a 24.200002,24.199998 39.160707 0 0 36.971,-7.33468 l 155.022,-296.35476 a 14.200001,14.199999 39.363385 0 0 -24.32407,-14.5764 z" />
        <circle cx="412.94986" cy="365.01718" r="29.75" />
      </g>
    </svg>
  )
}

/**
 * The icon — the check with the jeem's dot — for small or square spaces. It
 * takes `currentColor`, so the ground it sits on decides its colour: green on
 * bone, bone on green. Never shorter than 24px on a screen.
 */
export function Mark({
  className,
  title,
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      viewBox="472 78 368 482"
      fill="currentColor"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      // The caller sets the height; the viewBox sets the width from it. The
      // floor is the guide's: never shorter than 24px on a screen.
      className={cx('min-h-6 w-auto', className)}
    >
      <path d={MARK_CHECK} />
      <circle cx="597" cy="515.5" r="29.75" />
    </svg>
  )
}

/**
 * The icon as a texture, for the ground behind a page. A texture, not a
 * message: it stays at the low contrast the guide fixes (9% of the mark's
 * colour on bone, 10% of bone on green), never carries long text over it, and
 * never leans more than 15 degrees.
 */
export function MarkTexture({
  on = 'bone',
  className,
}: {
  on?: 'bone' | 'green'
  className?: string
}) {
  // Two of these can sit on one page, and two <pattern> elements cannot share
  // an id.
  const id = useId()
  const ink = on === 'bone' ? GREEN : BONE
  const opacity = on === 'bone' ? 0.09 : 0.1

  return (
    <svg
      aria-hidden
      className={cx('pointer-events-none', className)}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id={id} width="220" height="220" patternUnits="userSpaceOnUse">
          <g fill={ink} opacity={opacity}>
            <g transform="translate(18,14) scale(0.19) translate(-472,-78)">
              <path d={MARK_CHECK} />
              <circle cx="597" cy="515.5" r="29.75" />
            </g>
            <g transform="translate(118,112) rotate(-14) scale(0.19) translate(-472,-78)">
              <path d={MARK_CHECK} />
              <circle cx="597" cy="515.5" r="29.75" />
            </g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

/**
 * The shadda texture: the finer of the two, for a small area such as the back
 * of a card or a divider between two parts of a page.
 */
export function ShaddaTexture({
  /**
   * The tile, as a fraction of the guide's specimen. One application keeps one
   * scale; a band only tall enough for a smaller tile takes a smaller one and
   * stays with it.
   */
  unit = 1,
  className,
}: {
  unit?: number
  className?: string
}) {
  const id = useId()

  return (
    <svg aria-hidden className={cx('pointer-events-none', className)}>
      <defs>
        <pattern
          id={id}
          width={120 * unit}
          height={90 * unit}
          patternUnits="userSpaceOnUse"
        >
          <g fill={GREEN} opacity={0.1} transform={`scale(${unit})`}>
            <path
              transform="translate(14,14) scale(0.5) translate(-663,-91)"
              d="M 722 93 L 729.24 91.43 A 13 13 0 0 1 745 104.13 V 122.5 A 22 22 0 0 1 723 144.5 H 720.6 A 22 22 0 0 1 705.56 138.56 A 19 19 0 0 1 687 153.5 H 682 A 19 19 0 0 1 663 134.5 V 113.94 A 5 5 0 0 1 667.41 108.98 L 682.88 107.13 A 1 1 0 0 1 684 108.13 V 126.5 A 5.5 5.5 0 0 0 689.5 132 A 5.5 5.5 0 0 0 695 126.5 V 102.75 A 1 1 0 0 1 695.73 101.79 L 711.23 97.36 A 1 1 0 0 1 712.5 98.33 V 118.25 A 4.75 4.75 0 0 0 717.25 123 A 4.75 4.75 0 0 0 722 118.25 Z"
            />
            <path
              transform="translate(72,52) scale(0.5) translate(-663,-91)"
              d="M 722 93 L 729.24 91.43 A 13 13 0 0 1 745 104.13 V 122.5 A 22 22 0 0 1 723 144.5 H 720.6 A 22 22 0 0 1 705.56 138.56 A 19 19 0 0 1 687 153.5 H 682 A 19 19 0 0 1 663 134.5 V 113.94 A 5 5 0 0 1 667.41 108.98 L 682.88 107.13 A 1 1 0 0 1 684 108.13 V 126.5 A 5.5 5.5 0 0 0 689.5 132 A 5.5 5.5 0 0 0 695 126.5 V 102.75 A 1 1 0 0 1 695.73 101.79 L 711.23 97.36 A 1 1 0 0 1 712.5 98.33 V 118.25 A 4.75 4.75 0 0 0 717.25 123 A 4.75 4.75 0 0 0 722 118.25 Z"
            />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
