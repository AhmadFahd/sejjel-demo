import {
  addPerson,
  addShop,
  connect,
  recordPayment,
  recordPurchase,
} from '../builders'
import type { Scenario } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The fixture is dated from the moment it is seeded, not from the prototype's
 * August 2026. Statuses are worked out against today's date, so a fixture
 * pinned to a calendar would drift into everyone being overdue.
 */
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS)

const RIYAN_LIMIT = 1000
const RIYAN_TERM_DAYS = 30

/**
 * The prototype's fixture, from POC.md: بقالة الريان with three customers in
 * three different states, and the two other shops أحمد owes. Due dates are
 * left to the rule in `payday.ts` rather than written down here.
 */
export const poc: Scenario = {
  name: 'poc',
  description:
    'The prototype fixture: بقالة الريان, three customers, two more shops',

  async run(db) {
    const riyanOwner = await addPerson(db, {
      phoneNumber: '+966550111222',
      name: 'صاحب بقالة الريان',
    })
    const ahmed = await addPerson(db, {
      phoneNumber: '+966550123456',
      name: 'أحمد محمد',
      nationalId: '1074952683',
    })
    const khalid = await addPerson(db, {
      phoneNumber: '+966555987210',
      name: 'خالد علي',
      nationalId: '1088347215',
    })
    const salem = await addPerson(db, {
      phoneNumber: '+966533456789',
      name: 'سالم العتيبي',
      nationalId: '1029536471',
    })
    // Nobody has connected her and she keeps no shop: the state a person is in
    // before either side of the ledger exists for them.
    await addPerson(db, {
      phoneNumber: '+966500000001',
      name: 'نورة الحربي',
    })
    // The same state, kept that way: somebody for a shop to ask for.
    await addPerson(db, {
      phoneNumber: '+966500000002',
      name: 'عبدالله المطيري',
    })

    const noorOwner = await addPerson(db, {
      phoneNumber: '+966551000001',
      name: 'صاحب سوق النور',
    })
    const duhaOwner = await addPerson(db, {
      phoneNumber: '+966551000002',
      name: 'صاحب مخبز الضحى',
    })

    const riyan = await addShop(db, {
      ownerUserId: riyanOwner.id,
      name: 'بقالة الريان',
      defaultLimitRiyals: RIYAN_LIMIT,
      defaultTermDays: RIYAN_TERM_DAYS,
    })
    const noor = await addShop(db, {
      ownerUserId: noorOwner.id,
      name: 'سوق النور',
      defaultLimitRiyals: 500,
      defaultTermDays: RIYAN_TERM_DAYS,
    })
    const duha = await addShop(db, {
      ownerUserId: duhaOwner.id,
      name: 'مخبز الضحى',
      defaultLimitRiyals: 600,
      defaultTermDays: RIYAN_TERM_DAYS,
    })

    // أحمد owes 800: bought 1,000, paid 200 back.
    const ahmedAtRiyan = await connect(db, {
      merchantId: riyan.id,
      customerUserId: ahmed.id,
      termsAcceptedAt: daysAgo(70),
    })
    await recordPurchase(db, {
      connectionId: ahmedAtRiyan.id,
      riyals: 1000,
      description: 'مشتريات',
      termDays: RIYAN_TERM_DAYS,
      at: daysAgo(20),
    })
    await recordPayment(db, {
      connectionId: ahmedAtRiyan.id,
      riyals: 200,
      at: daysAgo(13),
    })

    // خالد is settled.
    const khalidAtRiyan = await connect(db, {
      merchantId: riyan.id,
      customerUserId: khalid.id,
      termsAcceptedAt: daysAgo(70),
    })
    await recordPurchase(db, {
      connectionId: khalidAtRiyan.id,
      riyals: 350,
      description: 'مشتريات',
      termDays: RIYAN_TERM_DAYS,
      at: daysAgo(44),
    })
    await recordPayment(db, {
      connectionId: khalidAtRiyan.id,
      riyals: 350,
      at: daysAgo(39),
    })

    // سالم is trusted with more than the shop's default, and is past his date.
    const salemAtRiyan = await connect(db, {
      merchantId: riyan.id,
      customerUserId: salem.id,
      limitOverrideRiyals: 1500,
      termsAcceptedAt: daysAgo(70),
    })
    await recordPurchase(db, {
      connectionId: salemAtRiyan.id,
      riyals: 1250,
      description: 'مواد بناء',
      termDays: RIYAN_TERM_DAYS,
      at: daysAgo(62),
    })

    // أحمد's other two shops: what gives the customer side more than one row.
    const ahmedAtNoor = await connect(db, {
      merchantId: noor.id,
      customerUserId: ahmed.id,
      termsAcceptedAt: daysAgo(70),
    })
    await recordPurchase(db, {
      connectionId: ahmedAtNoor.id,
      riyals: 350,
      description: 'مشتريات',
      termDays: RIYAN_TERM_DAYS,
      at: daysAgo(61),
    })
    await recordPayment(db, {
      connectionId: ahmedAtNoor.id,
      riyals: 350,
      at: daysAgo(52),
    })

    const ahmedAtDuha = await connect(db, {
      merchantId: duha.id,
      customerUserId: ahmed.id,
      termsAcceptedAt: daysAgo(70),
    })
    await recordPurchase(db, {
      connectionId: ahmedAtDuha.id,
      riyals: 420,
      description: 'مشتريات',
      termDays: RIYAN_TERM_DAYS,
      at: daysAgo(48),
    })
  },
}
