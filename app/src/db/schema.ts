import { randomUUID } from 'node:crypto'
import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

/**
 * Money is halalas, always. A riyal amount never reaches the database, and no
 * column holds a float: 12.30 ر.س is 1230 here.
 *
 * Time is a Unix timestamp in UTC. The prototype's clock is frozen at
 * 18 August 2026; nothing here has an equivalent.
 */
const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID())

const createdAt = () =>
  integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)

const updatedAt = () =>
  integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)

/**
 * Better Auth owns the identity columns on this table: `email`,
 * `emailVerified`, `image`, `updatedAt`, `phoneNumber` and
 * `phoneNumberVerified`. Nobody signs in by email; the address is a
 * placeholder because Better Auth's core model requires one.
 */
export const users = sqliteTable(
  'users',
  {
    id: id(),
    /** E.164, so one number is one row however it was typed. */
    phoneNumber: text('phone_number').notNull(),
    phoneNumberVerified: integer('phone_number_verified', { mode: 'boolean' })
      .notNull()
      .default(false),
    email: text('email').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .notNull()
      .default(false),
    image: text('image'),
    name: text('name').notNull(),
    nationalId: text('national_id'),
    locale: text('locale', { enum: ['ar', 'en'] })
      .notNull()
      .default('ar'),
    /** UC-14: hide the amounts. Per person, not per device. */
    hideAmounts: integer('hide_amounts', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('users_phone_number_idx').on(table.phoneNumber),
    uniqueIndex('users_email_idx').on(table.email),
  ],
)

export const merchants = sqliteTable(
  'merchants',
  {
    id: id(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    defaultLimitHalalas: integer('default_limit_halalas').notNull(),
    defaultTermDays: integer('default_term_days').notNull(),
    createdAt: createdAt(),
  },
  (table) => [index('merchants_owner_idx').on(table.ownerUserId)],
)

/**
 * The pair, not the customer, is what carries a balance: one person owes
 * several shops different amounts (UC-09). A null override means the shop's
 * default applies, and follows it when the shop changes it (UC-13).
 */
export const connections = sqliteTable(
  'connections',
  {
    id: id(),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchants.id),
    customerUserId: text('customer_user_id')
      .notNull()
      .references(() => users.id),
    limitOverrideHalalas: integer('limit_override_halalas'),
    termOverrideDays: integer('term_override_days'),
    /** A connection exists only after the customer agrees (UC-08). */
    status: text('status', { enum: ['pending', 'active', 'revoked'] })
      .notNull()
      .default('pending'),
    termsAcceptedAt: integer('terms_accepted_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('connections_pair_idx').on(
      table.merchantId,
      table.customerUserId,
    ),
    index('connections_customer_idx').on(table.customerUserId),
  ],
)

export const invoices = sqliteTable('invoices', {
  id: id(),
  /** Opaque to the app: the storage provider knows what it means. */
  storageKey: text('storage_key').notNull(),
  contentType: text('content_type').notNull(),
  byteSize: integer('byte_size').notNull(),
  uploadedByUserId: text('uploaded_by_user_id')
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
})

/**
 * The ledger. A balance is the sum of applied rows and is never stored, so it
 * cannot drift from its own history.
 *
 * `amountHalalas` is always positive; `kind` says which way it moves.
 */
export const transactions = sqliteTable(
  'transactions',
  {
    id: id(),
    connectionId: text('connection_id')
      .notNull()
      .references(() => connections.id),
    kind: text('kind', { enum: ['purchase', 'payment'] }).notNull(),
    amountHalalas: integer('amount_halalas').notNull(),
    status: text('status', {
      enum: ['pending', 'applied', 'cancelled', 'failed'],
    })
      .notNull()
      .default('pending'),
    description: text('description'),
    invoiceId: text('invoice_id').references(() => invoices.id),
    /**
     * Copied from the connection when the operation is recorded, so a later
     * change to the shop's term does not move a due date already given.
     */
    termDaysSnapshot: integer('term_days_snapshot'),
    dueAt: integer('due_at', { mode: 'timestamp' }),
    /**
     * UC-04: the merchant's own id for the operation they are recording. A
     * retried submit carries the same one, so the second attempt finds the
     * first purchase instead of making another.
     */
    requestId: text('request_id'),
    /**
     * UC-07: the customer's approval is the intent, the merchant's scan is the
     * apply, and the token is what makes applying twice impossible.
     */
    approvalToken: text('approval_token'),
    approvalExpiresAt: integer('approval_expires_at', { mode: 'timestamp' }),
    /**
     * UC-10: a settlement's life at the gateway. The ledger moves when the
     * gateway says `paid`, never when the button was pressed, so these say
     * which payment answered for this row and what it answered.
     */
    paymentId: text('payment_id'),
    paymentMethod: text('payment_method', {
      enum: ['apple_pay', 'mada', 'card'],
    }),
    receiptReference: text('receipt_reference'),
    failureReason: text('failure_reason'),
    /** UC-06: the merchant was warned about an overdue customer and went on. */
    overdueAcknowledged: integer('overdue_acknowledged', { mode: 'boolean' })
      .notNull()
      .default(false),
    appliedAt: integer('applied_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('transactions_approval_token_idx').on(table.approvalToken),
    uniqueIndex('transactions_request_id_idx').on(table.requestId),
    index('transactions_connection_idx').on(
      table.connectionId,
      table.createdAt,
    ),
    index('transactions_status_idx').on(table.status),
  ],
)

/**
 * UC-13: every change to a shop's terms, so a limit that moved has a record
 * of who moved it and when. A row with no connection is a change to the
 * shop's defaults; one with a connection is an override on that customer.
 *
 * The before and after are stored rather than derived, because the default a
 * customer inherited at the time cannot be read back off a later row.
 */
export const termChanges = sqliteTable(
  'term_changes',
  {
    id: id(),
    merchantId: text('merchant_id')
      .notNull()
      .references(() => merchants.id),
    connectionId: text('connection_id').references(() => connections.id),
    changedByUserId: text('changed_by_user_id')
      .notNull()
      .references(() => users.id),
    /**
     * The terms in force before and after, in halalas and in days, rather
     * than the override that was typed: a reader of the history wants what
     * the customer was actually held to, not which default it came from.
     */
    limitBeforeHalalas: integer('limit_before_halalas'),
    limitAfterHalalas: integer('limit_after_halalas'),
    termBeforeDays: integer('term_before_days'),
    termAfterDays: integer('term_after_days'),
    createdAt: createdAt(),
  },
  (table) => [
    index('term_changes_merchant_idx').on(table.merchantId, table.createdAt),
    index('term_changes_connection_idx').on(
      table.connectionId,
      table.createdAt,
    ),
  ],
)

export const notifications = sqliteTable(
  'notifications',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    kind: text('kind', {
      enum: [
        'purchase_awaiting_approval',
        'purchase_applied',
        'payment_received',
        'connection_requested',
        'limit_changed',
        'due_soon',
        'overdue',
      ],
    }).notNull(),
    connectionId: text('connection_id').references(() => connections.id),
    transactionId: text('transaction_id').references(() => transactions.id),
    /**
     * What this row is about, where saying it twice would be wrong: a due
     * date approaching is noticed every time a screen looks, and the person
     * should be told once per date, not once per look.
     */
    dedupeKey: text('dedupe_key'),
    readAt: integer('read_at', { mode: 'timestamp' }),
    /** An actionable notification can be acted on once (UC-12). */
    actedAt: integer('acted_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('notifications_user_idx').on(table.userId, table.createdAt),
    uniqueIndex('notifications_dedupe_idx').on(table.dedupeKey),
  ],
)

/** Better Auth's session model. A session is a row, so it survives a restart. */
export const sessions = sqliteTable(
  'sessions',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('sessions_token_idx').on(table.token),
    index('sessions_user_idx').on(table.userId),
  ],
)

/**
 * Better Auth's account model. Nothing here has a password or an OAuth
 * provider yet; the table exists because the core expects it.
 */
export const accounts = sqliteTable(
  'accounts',
  {
    id: id(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('accounts_user_idx').on(table.userId)],
)

/**
 * Where the OTP codes live, hashed by Better Auth. This replaces the
 * hand-rolled `otp_codes` table the schema started with.
 */
export const verifications = sqliteTable(
  'verifications',
  {
    id: id(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
)

/** UC-17: single-use, and expiring, so a shared link cannot be paid twice. */
export const paymentLinks = sqliteTable(
  'payment_links',
  {
    id: id(),
    connectionId: text('connection_id')
      .notNull()
      .references(() => connections.id),
    token: text('token').notNull(),
    amountHalalas: integer('amount_halalas').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    consumedAt: integer('consumed_at', { mode: 'timestamp' }),
    transactionId: text('transaction_id').references(() => transactions.id),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('payment_links_token_idx').on(table.token)],
)

/**
 * What the SSE stream replays. The id is a monotonic integer because that is
 * what a reconnecting client sends back as Last-Event-ID.
 */
export const events = sqliteTable(
  'events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    kind: text('kind').notNull(),
    /** What changed. The client re-fetches; the event carries no state. */
    subjectId: text('subject_id'),
    createdAt: createdAt(),
  },
  (table) => [index('events_user_idx').on(table.userId, table.id)],
)

export const usersRelations = relations(users, ({ many }) => ({
  merchants: many(merchants),
  connections: many(connections),
  notifications: many(notifications),
}))

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  owner: one(users, {
    fields: [merchants.ownerUserId],
    references: [users.id],
  }),
  connections: many(connections),
}))

export const termChangesRelations = relations(termChanges, ({ one }) => ({
  merchant: one(merchants, {
    fields: [termChanges.merchantId],
    references: [merchants.id],
  }),
  connection: one(connections, {
    fields: [termChanges.connectionId],
    references: [connections.id],
  }),
  changedBy: one(users, {
    fields: [termChanges.changedByUserId],
    references: [users.id],
  }),
}))

export const connectionsRelations = relations(connections, ({ one, many }) => ({
  merchant: one(merchants, {
    fields: [connections.merchantId],
    references: [merchants.id],
  }),
  customer: one(users, {
    fields: [connections.customerUserId],
    references: [users.id],
  }),
  transactions: many(transactions),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  connection: one(connections, {
    fields: [transactions.connectionId],
    references: [connections.id],
  }),
  invoice: one(invoices, {
    fields: [transactions.invoiceId],
    references: [invoices.id],
  }),
}))

export const schema = {
  users,
  merchants,
  connections,
  termChanges,
  invoices,
  transactions,
  notifications,
  sessions,
  accounts,
  verifications,
  paymentLinks,
  events,
}
