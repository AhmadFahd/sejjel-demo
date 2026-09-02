/**
 * The English catalogue is the shape every other catalogue is checked against:
 * `Messages` is its type, so a missing or misspelled key is a type error.
 */
export const en = {
  appName: 'Sejjel',
  appTagline: 'The ledger between a shop and its customers',

  'locale.switch': 'العربية',
  'locale.label': 'Language',

  'shell.nothingYet': 'The app shell. Nothing of the ledger is built yet.',
  'shell.environment': 'Environment',
  'shell.mode': 'Mode',
  'shell.nodeEnv': 'NODE_ENV',
  'shell.node': 'Node',
  'shell.startedAt': 'Server started',

  'money.currency': 'SAR',
  'money.hidden': '••••',

  'ledger.balance': 'Balance',
  'ledger.currentBalance': 'Current balance',
  'ledger.creditLimit': 'Credit limit',
  'ledger.available': 'Available',
  'ledger.dueDate': 'Due date',
  'ledger.customers': 'Customers',
  'ledger.outstanding': 'Outstanding',
  'ledger.overdueTotal': 'Overdue',
  'ledger.operations': 'Operations',
  'ledger.purchases': 'Purchases',
  'ledger.payments': 'Payments',
  'ledger.noDueDate': '—',

  'status.settled': 'Settled',
  'status.overdue': 'Past due',
  'status.at_limit': 'At the limit',
  'status.open': 'Open account',

  'payday.title': 'One due day: every Tuesday',
  'payday.note': 'Everything you owe falls due together, to make paying simple',

  'limit.used': '{percent}% of the limit used',
  'limit.nearlyFull': 'Close to the limit ({percent}%). Settling is advised',
  'limit.full': 'The limit is used up. No new purchase can be recorded',
} as const

export type MessageKey = keyof typeof en
export type Messages = Record<MessageKey, string>
