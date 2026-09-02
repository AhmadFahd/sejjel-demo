/**
 * Fixture data for the component gallery, taken from the prototype's seed. It
 * is data, not copy, which is why the names are written out here rather than in
 * a message catalogue.
 */
import { riyalsToHalalas } from '#/lib/money'

export const SAMPLE_CUSTOMERS = [
  {
    name: 'أحمد محمد',
    mobile: '0550 123 456',
    status: 'open' as const,
    balanceHalalas: riyalsToHalalas(800),
    limitHalalas: riyalsToHalalas(1000),
    dueAt: new Date('2026-09-08T00:00:00Z'),
  },
  {
    name: 'خالد علي',
    mobile: '0555 987 210',
    status: 'settled' as const,
    balanceHalalas: 0,
    limitHalalas: riyalsToHalalas(1000),
    dueAt: null,
  },
  {
    name: 'سالم العتيبي',
    mobile: '0533 456 789',
    status: 'overdue' as const,
    balanceHalalas: riyalsToHalalas(1250),
    limitHalalas: riyalsToHalalas(1500),
    dueAt: new Date('2026-07-27T00:00:00Z'),
  },
]

export const SAMPLE_TRANSACTIONS = [
  {
    kind: 'payment' as const,
    amountHalalas: riyalsToHalalas(200),
    at: new Date('2026-08-12T17:24:00Z'),
  },
  {
    kind: 'purchase' as const,
    amountHalalas: riyalsToHalalas(1000),
    at: new Date('2026-08-05T08:05:00Z'),
  },
]
