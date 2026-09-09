import type { Database } from '#/db/client'
import { connections, merchants, transactions, users } from '#/db/schema'
import { riyalsToHalalas } from '#/lib/money'

let counter = 0
const next = () => ++counter

export async function makeUser(
  db: Database,
  overrides: Partial<typeof users.$inferInsert> = {},
) {
  const n = next()
  const [row] = await db
    .insert(users)
    .values({
      phoneNumber: `+9665${String(n).padStart(8, '0')}`,
      email: `user-${n}@phone.sejjel.local`,
      name: `عميل ${n}`,
      ...overrides,
    })
    .returning()
  return row
}

export async function makeMerchant(
  db: Database,
  overrides: Partial<typeof merchants.$inferInsert> = {},
) {
  const owner = overrides.ownerUserId
    ? { id: overrides.ownerUserId }
    : await makeUser(db, { name: `تاجر ${next()}` })
  const [row] = await db
    .insert(merchants)
    .values({
      ownerUserId: owner.id,
      name: `متجر ${next()}`,
      defaultLimitHalalas: riyalsToHalalas(1000),
      defaultTermDays: 30,
      ...overrides,
    })
    .returning()
  return row
}

export async function makeConnection(
  db: Database,
  overrides: Partial<typeof connections.$inferInsert> = {},
) {
  const merchantId = overrides.merchantId ?? (await makeMerchant(db)).id
  const customerUserId = overrides.customerUserId ?? (await makeUser(db)).id
  const [row] = await db
    .insert(connections)
    .values({
      merchantId,
      customerUserId,
      status: 'active',
      ...overrides,
    })
    .returning()
  return row
}

export async function makeTransaction(
  db: Database,
  values: Partial<typeof transactions.$inferInsert> & { connectionId: string },
) {
  const [row] = await db
    .insert(transactions)
    .values({
      kind: 'purchase',
      status: 'applied',
      amountHalalas: riyalsToHalalas(100),
      appliedAt: new Date(),
      ...values,
    })
    .returning()
  return row
}
