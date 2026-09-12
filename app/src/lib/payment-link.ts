/**
 * UC-17: a link a merchant sends over their own WhatsApp, so a customer with
 * no app can still pay. What the page behind it is worth, and for how long,
 * is decided here; the row it reads is in `db/queries/payment-link.ts`.
 */

/**
 * A week, which is one turn of the pay-day: a link made on any day still
 * works on the Tuesday it is asking about, and is gone before the Tuesday
 * after that, when the figure on it would be somebody's guess.
 */
export const LINK_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function linkExpiresAt(now: Date): Date {
  return new Date(now.getTime() + LINK_DAYS * DAY_MS)
}

/**
 * `changed` is the case the ruling in `MVP.md` does not cover: the balance
 * moved after the link was sent — a cash payment at the counter, or a
 * settlement in the app — and the amount printed on the page is now more than
 * is owed. Charging it would take money that is not due, so the page says so
 * and offers nothing to press.
 */
export type LinkState = 'payable' | 'paid' | 'expired' | 'changed'

export function linkState(
  link: { amountHalalas: number; expiresAt: Date; consumedAt: Date | null },
  balanceHalalas: number,
  now: Date,
): LinkState {
  if (link.consumedAt) return 'paid'
  // Settled another way is still settled, and a second open must not charge
  // again for it — the ruling in `MVP.md`.
  if (balanceHalalas <= 0) return 'paid'
  if (link.expiresAt.getTime() <= now.getTime()) return 'expired'
  if (link.amountHalalas > balanceHalalas) return 'changed'
  return 'payable'
}

/**
 * Where the link points. Built in the browser, like the shop's printed code,
 * because the origin the merchant is looking at is the one their customer
 * should be sent to.
 */
export function paymentLinkUrl(token: string, origin?: string) {
  const base =
    origin ?? (typeof window === 'undefined' ? '' : window.location.origin)
  return `${base}/r/${token}`
}

/**
 * WhatsApp's own share URL, with the message already typed. Nothing is sent
 * from here: it opens the merchant's WhatsApp on a draft to their customer,
 * which is the whole of what this ticket automates.
 */
export function whatsappUrl(mobileE164: string, text: string) {
  return `https://wa.me/${mobileE164.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
