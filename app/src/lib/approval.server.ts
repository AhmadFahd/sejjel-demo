import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

import { APPROVAL_SECONDS } from './approval'

/**
 * UC-07: the customer's approval, in a form the merchant's phone can carry to
 * the server. Signed, so a code cannot be written by hand; short-lived, so one
 * photographed off a screen is worthless a couple of minutes later.
 */
export { APPROVAL_SECONDS }

export type Approval = {
  /** The operation this approves, and nothing else. */
  transactionId: string
  /** The shop it was issued to, and nobody else. */
  merchantId: string
  /** Seconds since the epoch. */
  expiresAt: number
  /** Makes two codes for the same operation different from each other. */
  nonce: string
}

export type ApprovalProblem = 'shape' | 'signature' | 'expired'

function secret(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.AUTH_SECRET
  if (!value) throw new Error('AUTH_SECRET is required to sign an approval')
  return value
}

function sign(body: string, env?: NodeJS.ProcessEnv): string {
  return createHmac('sha256', secret(env)).update(body).digest('base64url')
}

export function issueApproval(
  input: { transactionId: string; merchantId: string },
  now: Date = new Date(),
  env?: NodeJS.ProcessEnv,
): string {
  const approval: Approval = {
    transactionId: input.transactionId,
    merchantId: input.merchantId,
    expiresAt: Math.floor(now.getTime() / 1000) + APPROVAL_SECONDS,
    nonce: randomUUID(),
  }

  const body = Buffer.from(JSON.stringify(approval)).toString('base64url')
  return `${body}.${sign(body, env)}`
}

export type ApprovalCheck =
  { ok: true; approval: Approval } | { ok: false; problem: ApprovalProblem }

/**
 * A code is refused for exactly one reason, and the merchant is told which:
 * a shape that is not ours, a signature that is not ours, or a code that has
 * run out. Tampering shows up as a broken signature, since the body is what
 * is signed.
 */
export function readApproval(
  code: string,
  now: Date = new Date(),
  env?: NodeJS.ProcessEnv,
): ApprovalCheck {
  const [body, signature] = code.trim().split('.')
  if (!body || !signature) return { ok: false, problem: 'shape' }

  const expected = Buffer.from(sign(body, env))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, problem: 'signature' }
  }

  let approval: Approval
  try {
    approval = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as Approval
  } catch {
    return { ok: false, problem: 'shape' }
  }

  if (
    typeof approval.transactionId !== 'string' ||
    typeof approval.merchantId !== 'string' ||
    typeof approval.expiresAt !== 'number'
  ) {
    return { ok: false, problem: 'shape' }
  }

  if (approval.expiresAt * 1000 <= now.getTime()) {
    return { ok: false, problem: 'expired' }
  }

  return { ok: true, approval }
}
