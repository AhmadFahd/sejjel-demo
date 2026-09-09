import { addPerson, addShop } from '../builders'
import type { Scenario } from '../types'

/**
 * One shop, one owner, no customers. For looking at the empty states, which
 * are otherwise the hardest screens to reach.
 */
export const empty: Scenario = {
  name: 'empty',
  description: 'A new shop with no customers yet',

  async run(db) {
    const owner = await addPerson(db, {
      phoneNumber: '+966550111222',
      name: 'صاحب بقالة الريان',
    })
    await addShop(db, {
      ownerUserId: owner.id,
      name: 'بقالة الريان',
      defaultLimitRiyals: 1000,
      defaultTermDays: 30,
    })
  },
}
