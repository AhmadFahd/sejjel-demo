import {
  addPerson,
  addShop,
  connect,
  recordPayment,
  recordPurchase,
} from '../builders'
import type { Scenario } from '../types'

const at = (iso: string) => new Date(`${iso}T09:41:00.000Z`)

const RIYAN_LIMIT = 1000
const RIYAN_TERM_DAYS = 30

/**
 * The prototype's fixture, from POC.md: بقالة الريان with three customers in
 * three different states, and the two other shops أحمد owes. The dates come
 * from the prototype, which is pinned to August 2026; they are data, not the
 * due-date rule.
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
      termsAcceptedAt: at('2026-07-01'),
    })
    await recordPurchase(db, {
      connectionId: ahmedAtRiyan.id,
      riyals: 1000,
      description: 'مشتريات',
      termDays: RIYAN_TERM_DAYS,
      dueAt: at('2026-08-27'),
      at: at('2026-08-05'),
    })
    await recordPayment(db, {
      connectionId: ahmedAtRiyan.id,
      riyals: 200,
      at: at('2026-08-12'),
    })

    // خالد is settled.
    const khalidAtRiyan = await connect(db, {
      merchantId: riyan.id,
      customerUserId: khalid.id,
      termsAcceptedAt: at('2026-07-01'),
    })
    await recordPurchase(db, {
      connectionId: khalidAtRiyan.id,
      riyals: 350,
      description: 'مشتريات',
      termDays: RIYAN_TERM_DAYS,
      dueAt: at('2026-08-27'),
      at: at('2026-07-28'),
    })
    await recordPayment(db, {
      connectionId: khalidAtRiyan.id,
      riyals: 350,
      at: at('2026-08-02'),
    })

    // سالم is trusted with more than the shop's default, and is past his date.
    const salemAtRiyan = await connect(db, {
      merchantId: riyan.id,
      customerUserId: salem.id,
      limitOverrideRiyals: 1500,
      termsAcceptedAt: at('2026-07-01'),
    })
    await recordPurchase(db, {
      connectionId: salemAtRiyan.id,
      riyals: 1250,
      description: 'مواد بناء',
      termDays: RIYAN_TERM_DAYS,
      dueAt: at('2026-07-27'),
      at: at('2026-07-10'),
    })

    // أحمد's other two shops: what gives the customer side more than one row.
    const ahmedAtNoor = await connect(db, {
      merchantId: noor.id,
      customerUserId: ahmed.id,
      termsAcceptedAt: at('2026-07-01'),
    })
    await recordPurchase(db, {
      connectionId: ahmedAtNoor.id,
      riyals: 350,
      description: 'مشتريات',
      termDays: RIYAN_TERM_DAYS,
      dueAt: at('2026-07-27'),
      at: at('2026-07-11'),
    })
    await recordPayment(db, {
      connectionId: ahmedAtNoor.id,
      riyals: 350,
      at: at('2026-07-20'),
    })

    const ahmedAtDuha = await connect(db, {
      merchantId: duha.id,
      customerUserId: ahmed.id,
      termsAcceptedAt: at('2026-07-01'),
    })
    await recordPurchase(db, {
      connectionId: ahmedAtDuha.id,
      riyals: 420,
      description: 'مشتريات',
      termDays: RIYAN_TERM_DAYS,
      dueAt: at('2026-07-27'),
      at: at('2026-08-01'),
    })
  },
}
