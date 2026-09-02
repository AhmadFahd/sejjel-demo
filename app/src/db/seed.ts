import { createDatabase, databaseConfigFromEnv } from './client'
import { migrateDatabase } from './migrate'
import { connections, merchants, transactions, users } from './schema'
import type { Database } from './client'
import { riyalsToHalalas } from '../lib/money'

/**
 * The prototype's fixture, from POC.md: بقالة الريان with three customers, and
 * two more shops that أحمد owes. The dates come from the prototype, which is
 * pinned to August 2026; they are data, not the due-date rule.
 */
const RIYAN_DEFAULT_LIMIT = riyalsToHalalas(1000)
const RIYAN_DEFAULT_TERM_DAYS = 30

const at = (iso: string) => new Date(`${iso}T09:41:00.000Z`)

async function seed(db: Database) {
  const [owner, ahmed, khalid, salem] = await db
    .insert(users)
    .values([
      { mobile: '+966550111222', name: 'صاحب بقالة الريان' },
      { mobile: '+966550123456', name: 'أحمد محمد', nationalId: '1074952683' },
      { mobile: '+966555987210', name: 'خالد علي', nationalId: '1088347215' },
      {
        mobile: '+966533456789',
        name: 'سالم العتيبي',
        nationalId: '1029536471',
      },
    ])
    .returning()

  const [noorOwner, duhaOwner] = await db
    .insert(users)
    .values([
      { mobile: '+966551000001', name: 'صاحب سوق النور' },
      { mobile: '+966551000002', name: 'صاحب مخبز الضحى' },
    ])
    .returning()

  const [riyan, noor, duha] = await db
    .insert(merchants)
    .values([
      {
        ownerUserId: owner.id,
        name: 'بقالة الريان',
        defaultLimitHalalas: RIYAN_DEFAULT_LIMIT,
        defaultTermDays: RIYAN_DEFAULT_TERM_DAYS,
      },
      {
        ownerUserId: noorOwner.id,
        name: 'سوق النور',
        defaultLimitHalalas: riyalsToHalalas(500),
        defaultTermDays: RIYAN_DEFAULT_TERM_DAYS,
      },
      {
        ownerUserId: duhaOwner.id,
        name: 'مخبز الضحى',
        defaultLimitHalalas: riyalsToHalalas(600),
        defaultTermDays: RIYAN_DEFAULT_TERM_DAYS,
      },
    ])
    .returning()

  const [ahmedAtRiyan, khalidAtRiyan, salemAtRiyan, ahmedAtNoor, ahmedAtDuha] =
    await db
      .insert(connections)
      .values([
        {
          merchantId: riyan.id,
          customerUserId: ahmed.id,
          status: 'active',
          termsAcceptedAt: at('2026-07-01'),
        },
        {
          merchantId: riyan.id,
          customerUserId: khalid.id,
          status: 'active',
          termsAcceptedAt: at('2026-07-01'),
        },
        {
          merchantId: riyan.id,
          customerUserId: salem.id,
          status: 'active',
          termsAcceptedAt: at('2026-07-01'),
          // سالم is trusted with more than the shop's default.
          limitOverrideHalalas: riyalsToHalalas(1500),
        },
        {
          merchantId: noor.id,
          customerUserId: ahmed.id,
          status: 'active',
          termsAcceptedAt: at('2026-07-01'),
        },
        {
          merchantId: duha.id,
          customerUserId: ahmed.id,
          status: 'active',
          termsAcceptedAt: at('2026-07-01'),
        },
      ])
      .returning()

  await db.insert(transactions).values([
    // أحمد at بقالة الريان: 1,000 bought, 200 paid back, 800 outstanding.
    {
      connectionId: ahmedAtRiyan.id,
      kind: 'purchase',
      status: 'applied',
      amountHalalas: riyalsToHalalas(1000),
      description: 'مشتريات',
      termDaysSnapshot: RIYAN_DEFAULT_TERM_DAYS,
      dueAt: at('2026-08-27'),
      appliedAt: at('2026-08-05'),
      createdAt: at('2026-08-05'),
    },
    {
      connectionId: ahmedAtRiyan.id,
      kind: 'payment',
      status: 'applied',
      amountHalalas: riyalsToHalalas(200),
      appliedAt: at('2026-08-12'),
      createdAt: at('2026-08-12'),
    },
    // خالد: settled.
    {
      connectionId: khalidAtRiyan.id,
      kind: 'purchase',
      status: 'applied',
      amountHalalas: riyalsToHalalas(350),
      description: 'مشتريات',
      termDaysSnapshot: RIYAN_DEFAULT_TERM_DAYS,
      dueAt: at('2026-08-27'),
      appliedAt: at('2026-07-28'),
      createdAt: at('2026-07-28'),
    },
    {
      connectionId: khalidAtRiyan.id,
      kind: 'payment',
      status: 'applied',
      amountHalalas: riyalsToHalalas(350),
      appliedAt: at('2026-08-02'),
      createdAt: at('2026-08-02'),
    },
    // سالم: 1,250 owed, past its date.
    {
      connectionId: salemAtRiyan.id,
      kind: 'purchase',
      status: 'applied',
      amountHalalas: riyalsToHalalas(1250),
      description: 'مواد بناء',
      termDaysSnapshot: RIYAN_DEFAULT_TERM_DAYS,
      dueAt: at('2026-07-27'),
      appliedAt: at('2026-07-10'),
      createdAt: at('2026-07-10'),
    },
    // أحمد's other two shops.
    {
      connectionId: ahmedAtNoor.id,
      kind: 'purchase',
      status: 'applied',
      amountHalalas: riyalsToHalalas(350),
      description: 'مشتريات',
      termDaysSnapshot: RIYAN_DEFAULT_TERM_DAYS,
      dueAt: at('2026-07-27'),
      appliedAt: at('2026-07-11'),
      createdAt: at('2026-07-11'),
    },
    {
      connectionId: ahmedAtNoor.id,
      kind: 'payment',
      status: 'applied',
      amountHalalas: riyalsToHalalas(350),
      appliedAt: at('2026-07-20'),
      createdAt: at('2026-07-20'),
    },
    {
      connectionId: ahmedAtDuha.id,
      kind: 'purchase',
      status: 'applied',
      amountHalalas: riyalsToHalalas(420),
      description: 'مشتريات',
      termDaysSnapshot: RIYAN_DEFAULT_TERM_DAYS,
      dueAt: at('2026-07-27'),
      appliedAt: at('2026-08-01'),
      createdAt: at('2026-08-01'),
    },
  ])
}

async function main() {
  const config = databaseConfigFromEnv()
  if (config.url.startsWith('libsql://')) {
    throw new Error('The seed is for development and previews, not production')
  }

  const db = createDatabase(config)
  await migrateDatabase(db)

  const existing = await db.select().from(users).limit(1)
  if (existing.length > 0) {
    console.log('Already seeded; nothing to do.')
    return
  }

  await seed(db)
  console.log('Seeded بقالة الريان, three customers, and two more shops.')
}

await main()
