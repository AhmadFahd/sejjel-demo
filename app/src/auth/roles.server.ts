import { and, eq, ne } from 'drizzle-orm'
import { getDatabase } from '#/db/client'
import { connections, merchants } from '#/db/schema'
import { NO_ROLES } from './roles'
import type { Roles } from './roles'

/**
 * Read from the ledger rather than from a column: a role is a fact about what
 * exists, and a stored flag would be one more thing that can be wrong.
 */
export async function resolveRoles(userId: string): Promise<Roles> {
  const db = getDatabase()

  const shop = (
    await db
      .select({ id: merchants.id, name: merchants.name })
      .from(merchants)
      .where(eq(merchants.ownerUserId, userId))
      .limit(1)
  ).at(0)

  const connection = (
    await db
      .select({ id: connections.id })
      .from(connections)
      .where(
        and(
          eq(connections.customerUserId, userId),
          ne(connections.status, 'revoked'),
        ),
      )
      .limit(1)
  ).at(0)

  return {
    ...NO_ROLES,
    merchant: shop ?? null,
    customer: connection !== undefined,
  }
}
