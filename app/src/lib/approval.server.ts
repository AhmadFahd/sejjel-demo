import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

import { APPROVAL_SECONDS } from './approval'

/**
 * UC-07: the customer's approval, in a form the merchant's phone can carry to
 * the server. Signed, so a code cannot be written by hand; short-lived, so one
 * photographed off a screen is worthless a couple of minutes later.
 */
export { APPROVAL_SECONDS }

export type Approval = {
  kind?: 'approval'
  /** The operation this approves, and nothing else. */
  transactionId: string
  /** The shop it was issued to, and nobody else. */
  merchantId: string
  /** Seconds since the epoch. */
  expiresAt: number
  /** Makes two codes for the same operation different from each other. */
  nonce: string
}

/**
 * UC-08: the code on a customer's own card. It says who they are and nothing
 * else, and it runs out on the same two minutes an approval does, so one
 * photographed off a screen cannot be used by whoever took the picture.
 */
export type Identity = {
  kind: 'identity'
  customerUserId: string
  expiresAt: number
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

function seal(
  payload: Record<string, unknown>,
  now: Date,
  env?: NodeJS.ProcessEnv,
): string {
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      expiresAt: Math.floor(now.getTime() / 1000) + APPROVAL_SECONDS,
      nonce: randomUUID(),
    }),
  ).toString('base64url')
  return `${body}.${sign(body, env)}`
}

export function issueApproval(
  input: { transactionId: string; merchantId: string },
  now: Date = new Date(),
  env?: NodeJS.ProcessEnv,
): string {
  return seal({ kind: 'approval', ...input }, now, env)
}

export function issueIdentity(
  customerUserId: string,
  now: Date = new Date(),
  env?: NodeJS.ProcessEnv,
): string {
  return seal({ kind: 'identity', customerUserId }, now, env)
}

export type ApprovalCheck =
  { ok: true; approval: Approval } | { ok: false; problem: ApprovalProblem }

export type IdentityCheck =
  { ok: true; identity: Identity } | { ok: false; problem: ApprovalProblem }

export type CodeCheck =
  | { ok: true; payload: Approval | Identity }
  | { ok: false; problem: ApprovalProblem }

/**
 * A code is refused for exactly one reason, and the merchant is told which:
 * a shape that is not ours, a signature that is not ours, or a code that has
 * run out. Tampering shows up as a broken signature, since the body is what
 * is signed.
 */
export function readCode(
  code: string,
  now: Date = new Date(),
  env?: NodeJS.ProcessEnv,
): CodeCheck {
  const [body, signature] = code.trim().split('.')
  if (!body || !signature) return { ok: false, problem: 'shape' }

  const expected = Buffer.from(sign(body, env))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, problem: 'signature' }
  }

  let payload: Approval | Identity
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as
      Approval | Identity
  } catch {
    return { ok: false, problem: 'shape' }
  }

  if (typeof payload.expiresAt !== 'number') {
    return { ok: false, problem: 'shape' }
  }

  const shaped =
    payload.kind === 'identity'
      ? typeof payload.customerUserId === 'string'
      : typeof payload.transactionId === 'string' &&
        typeof payload.merchantId === 'string'
  if (!shaped) return { ok: false, problem: 'shape' }

  if (payload.expiresAt * 1000 <= now.getTime()) {
    return { ok: false, problem: 'expired' }
  }

  return { ok: true, payload }
}

/** The same read, for a caller that will only take an approval. */
export function readApproval(
  code: string,
  now: Date = new Date(),
  env?: NodeJS.ProcessEnv,
): ApprovalCheck {
  const check = readCode(code, now, env)
  if (!check.ok) return check
  return check.payload.kind === 'identity'
    ? { ok: false, problem: 'shape' }
    : { ok: true, approval: check.payload }
}

/** And for one that will only take a customer's card. */
export function readIdentity(
  code: string,
  now: Date = new Date(),
  env?: NodeJS.ProcessEnv,
): IdentityCheck {
  const check = readCode(code, now, env)
  if (!check.ok) return check
  return check.payload.kind === 'identity'
    ? { ok: true, identity: check.payload }
    : { ok: false, problem: 'shape' }
}
