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

  'auth.title': 'Sign in',
  'auth.phoneLabel': 'Mobile number',
  'auth.phonePlaceholder': '05X XXX XXXX',
  'auth.phoneHint': 'The number your shop or your ledger is registered to',
  'auth.sendCode': 'Send the code',
  'auth.codeLabel': 'Verification code',
  'auth.codeSentTo': 'Enter the code sent to {phoneNumber}',
  'auth.verify': 'Sign in',
  'auth.resend': 'Send another code',
  'auth.changeNumber': 'Use a different number',
  'auth.signOut': 'Sign out',
  'auth.signedInAs': 'Signed in as {name}',
  'auth.error.phoneInvalid': 'That is not a Saudi mobile number',
  'auth.error.codeWrong': 'That code is not right',
  'auth.error.unknownNumber':
    'No account for that number. A shop has to connect you first.',
  'auth.error.tooMany': 'Too many tries. Ask for a new code.',
  'auth.error.generic': 'Something went wrong. Try again.',

  'role.merchant': 'My shop',
  'role.customer': 'What I owe',
  'role.switchToMerchant': 'Go to my shop',
  'role.switchToCustomer': 'Go to what I owe',

  'welcome.title': 'Nothing here yet',
  'welcome.body':
    'No shop has connected you, and you do not keep a shop. A shop connects you the first time it records something on credit.',
  'welcome.openShop': 'I keep a shop',

  'shop.newTitle': 'Open your shop',
  'shop.name': 'Shop name',
  'shop.defaultLimit': 'Default credit limit',
  'shop.defaultTerm': 'Default term, in days',
  'shop.defaultsNote':
    'What a new customer starts with. Either can be changed for one customer later.',
  'shop.open': 'Open the shop',
  'shop.error.name': 'A shop needs a name',
  'shop.error.limit': 'A limit between 1 and 100,000 ر.س',
  'shop.error.term': 'A term between 1 and 90 days',
  'shop.error.already': 'You already keep a shop',

  'merchant.noCustomers': 'No customers yet',
  'merchant.noCustomersBody':
    'A customer joins the first time you record something on credit for them.',
  'customer.noMerchants': 'No shops yet',
  'customer.noMerchantsBody':
    'A shop appears here the first time it records something on credit for you.',

  'money.currency': 'SAR',
  'money.hidden': '••••',

  'ledger.balance': 'Balance',
  'ledger.currentBalance': 'Current balance',
  'ledger.creditLimit': 'Credit limit',
  'ledger.available': 'Available',
  'ledger.dueDate': 'Due date',
  'ledger.customers': 'Customers',
  'ledger.shops': 'Shops',
  'ledger.totalDebt': 'Total debt',
  'ledger.outstanding': 'Outstanding',
  'ledger.overdueTotal': 'Overdue',
  'ledger.operations': 'Operations',
  'ledger.purchases': 'Purchases',
  'ledger.payments': 'Payments',
  'ledger.noDueDate': '—',
  'ledger.noOperations': 'Nothing has been recorded on this account yet.',
  'tx.purchase': 'Purchase',
  'tx.payment': 'Payment',
  'tx.pending': 'Awaiting approval',
  'tx.cancelled': 'Cancelled',
  'tx.failed': 'Failed',
  'tx.expired': 'Lapsed',

  'notFound.title': 'Not here',
  'notFound.body': 'This page does not exist, or it is not yours to open.',
  'notFound.home': 'Back to the app',
  'nav.back': 'Back',
  'page.previous': 'Previous',
  'page.next': 'Next',
  'page.position': 'Page {page} of {pages}',

  'status.settled': 'Settled',
  'status.overdue': 'Past due',
  'status.at_limit': 'At the limit',
  'status.due_soon': 'Due soon',
  'status.open': 'Open account',

  'operation.new': 'New operation',
  'operation.customer': 'Customer',
  'operation.pickCustomer': 'Choose a customer',
  'operation.amount': 'Amount',
  'operation.description': 'Description (optional)',
  'operation.projected': 'Balance after this',
  'operation.submit': 'Send to the customer',
  'operation.waiting': 'Waiting for the customer',
  'operation.waitingBody':
    'It is on their screen to approve. Nothing is owed until they do, and it lapses after {minutes} minutes.',
  'operation.cancel': 'Call it off',
  'operation.record': 'Record an operation',
  'operation.error.amount': 'Enter an amount in riyals.',
  'operation.error.ceiling': 'That is more than one operation can be.',
  'operation.error.limit': 'This would take the balance past the limit.',
  'operation.error.connection': 'This customer is not one of yours.',

  'payday.title': 'One due day: every Tuesday',
  'payday.note': 'Everything you owe falls due together, to make paying simple',
  'payday.next': 'Next pay-day: {date}',

  'limit.used': '{percent}% of the limit used',
  'limit.nearlyFull': 'Close to the limit ({percent}%). Settling is advised',
  'limit.full': 'The limit is used up. No new purchase can be recorded',
} as const

export type MessageKey = keyof typeof en
export type Messages = Record<MessageKey, string>
