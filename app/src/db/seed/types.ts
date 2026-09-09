import type { Database } from '../client'

/**
 * A scenario is a named, self-contained state of the ledger. Each one starts
 * from an empty database and says what it puts there, so a developer can pick
 * the situation they want to look at rather than the one seed everybody has.
 */
export type Scenario = {
  name: string
  description: string
  run: (db: Database) => Promise<void>
}
