/**
 * Amounts are integers in halalas everywhere but the screen. A riyal figure
 * typed by a merchant is converted once, here, and never stored as a float.
 */
export const HALALAS_PER_RIYAL = 100

export function riyalsToHalalas(riyals: number): number {
  if (!Number.isFinite(riyals)) {
    throw new RangeError('An amount must be a finite number of riyals')
  }
  return Math.round(riyals * HALALAS_PER_RIYAL)
}

export function halalasToRiyals(halalas: number): number {
  return halalas / HALALAS_PER_RIYAL
}

/**
 * What a merchant typed, as halalas. Digits, an optional decimal part, and
 * nothing else; the prototype strips non-digits and calls it an integer.
 */
export function parseAmount(input: string): number | null {
  const trimmed = input
    .trim()
    .replace(/[٫٬,]/g, (c) => (c === '٬' || c === ',' ? '' : '.'))
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const halalas = riyalsToHalalas(Number(trimmed))
  return halalas > 0 ? halalas : null
}
