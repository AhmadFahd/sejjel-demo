import { riyalsToHalalas } from '#/lib/money'
import { connections, merchants, transactions, users } from '../schema'
import type { Database } from '../client'

/**
 * The vocabulary a scenario is written in. Each function inserts one thing and
 * hands back the row, so a scenario reads as a description of a shop rather
 * than as a pile of inserts.
 *
 * Amounts are riyals here and halalas in the database: a scenario is written by
 * a person, and people talk in riyals.
 */

/** Sign-in works only for a verified number, so seeded people are verified. */
export async function addPerson(
  db: Database,
  person: {
    phoneNumber: string
    name: string
    nationalId?: string
    locale?: 'ar' | 'en'
  },
) {
  const [row] = await db
    .insert(users)
    .values({
      phoneNumber: person.phoneNumber,
      phoneNumberVerified: true,
      email: `${person.phoneNumber}@phone.sejjel.local`,
      emailVerified: false,
      name: person.name,
      nationalId: person.nationalId,
      locale: person.locale ?? 'ar',
    })
    .returning()
  return row
}

export async function addShop(
  db: Database,
  shop: {
    ownerUserId: string
    name: string
    defaultLimitRiyals: number
    defaultTermDays: number
  },
) {
  const [row] = await db
    .insert(merchants)
    .values({
      ownerUserId: shop.ownerUserId,
      name: shop.name,
      defaultLimitHalalas: riyalsToHalalas(shop.defaultLimitRiyals),
      defaultTermDays: shop.defaultTermDays,
    })
    .returning()
  return row
}

export async function connect(
  db: Database,
  link: {
    merchantId: string
    customerUserId: string
    limitOverrideRiyals?: number
    termOverrideDays?: number
    status?: 'pending' | 'active' | 'revoked'
    termsAcceptedAt?: Date
  },
) {
  const [row] = await db
    .insert(connections)
    .values({
      merchantId: link.merchantId,
      customerUserId: link.customerUserId,
      limitOverrideHalalas:
        link.limitOverrideRiyals === undefined
          ? null
          : riyalsToHalalas(link.limitOverrideRiyals),
      termOverrideDays: link.termOverrideDays ?? null,
      status: link.status ?? 'active',
      termsAcceptedAt: link.termsAcceptedAt ?? new Date(),
    })
    .returning()
  return row
}

export async function recordPurchase(
  db: Database,
  purchase: {
    connectionId: string
    riyals: number
    description?: string
    at: Date
    dueAt?: Date
    termDays?: number
    status?: 'pending' | 'applied' | 'cancelled'
  },
) {
  const [row] = await db
    .insert(transactions)
    .values({
      connectionId: purchase.connectionId,
      kind: 'purchase',
      status: purchase.status ?? 'applied',
      amountHalalas: riyalsToHalalas(purchase.riyals),
      description: purchase.description,
      termDaysSnapshot: purchase.termDays ?? null,
      dueAt: purchase.dueAt ?? null,
      appliedAt: purchase.status === 'pending' ? null : purchase.at,
      createdAt: purchase.at,
    })
    .returning()
  return row
}

export async function recordPayment(
  db: Database,
  payment: { connectionId: string; riyals: number; at: Date },
) {
  const [row] = await db
    .insert(transactions)
    .values({
      connectionId: payment.connectionId,
      kind: 'payment',
      status: 'applied',
      amountHalalas: riyalsToHalalas(payment.riyals),
      appliedAt: payment.at,
      createdAt: payment.at,
    })
    .returning()
  return row
}
