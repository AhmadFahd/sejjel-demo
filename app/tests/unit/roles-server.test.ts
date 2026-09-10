import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '#/db/client'
import type * as DbClient from '#/db/client'
import { createTestDatabase } from '../support/database'
import { makeConnection, makeMerchant, makeUser } from '../support/factories'

let db: Database

/** The role resolver asks for the app's database; give it the test's. */
vi.mock('#/db/client', async (importOriginal) => {
  const actual = await importOriginal<typeof DbClient>()
  return { ...actual, getDatabase: () => db }
})

const { resolveRoles } = await import('#/auth/roles.server')

beforeEach(async () => {
  db = await createTestDatabase()
})

describe('resolveRoles', () => {
  it('makes someone a merchant because they keep a shop', async () => {
    const owner = await makeUser(db)
    const shop = await makeMerchant(db, { ownerUserId: owner.id })

    const roles = await resolveRoles(owner.id)

    expect(roles.merchant).toEqual({ id: shop.id, name: shop.name })
    expect(roles.customer).toBe(false)
  })

  it('makes someone a customer because a shop connected them', async () => {
    const person = await makeUser(db)
    await makeConnection(db, { customerUserId: person.id })

    const roles = await resolveRoles(person.id)

    expect(roles.customer).toBe(true)
    expect(roles.merchant).toBeNull()
  })

  /** A shopkeeper who also owes the baker. */
  it('makes someone both when the ledger says both', async () => {
    const person = await makeUser(db)
    await makeMerchant(db, { ownerUserId: person.id })
    await makeConnection(db, { customerUserId: person.id })

    const roles = await resolveRoles(person.id)

    expect(roles.merchant).not.toBeNull()
    expect(roles.customer).toBe(true)
  })

  it('gives a person nobody has connected neither role', async () => {
    const person = await makeUser(db)

    expect(await resolveRoles(person.id)).toEqual({
      merchant: null,
      customer: false,
    })
  })

  it('does not count a connection a shop has revoked', async () => {
    const person = await makeUser(db)
    await makeConnection(db, { customerUserId: person.id, status: 'revoked' })

    expect((await resolveRoles(person.id)).customer).toBe(false)
  })

  it('counts a connection still waiting for the customer to agree', async () => {
    const person = await makeUser(db)
    await makeConnection(db, { customerUserId: person.id, status: 'pending' })

    expect((await resolveRoles(person.id)).customer).toBe(true)
  })
})
