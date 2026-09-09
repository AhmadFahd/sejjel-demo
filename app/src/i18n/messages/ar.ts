import type { Messages } from './en'

/** Lifted from the prototype's screens rather than translated afresh. */
export const ar = {
  appName: 'سجّل',
  appTagline: 'الدفتر بين المتجر وعملائه',

  'locale.switch': 'English',
  'locale.label': 'اللغة',

  'shell.nothingYet': 'هيكل التطبيق. لم يُبنَ شيء من الدفتر بعد.',
  'shell.environment': 'البيئة',
  'shell.mode': 'الوضع',
  'shell.nodeEnv': 'NODE_ENV',
  'shell.node': 'Node',
  'shell.startedAt': 'بدأ الخادم',

  'money.currency': 'ر.س',
  'money.hidden': '••••',

  'ledger.balance': 'الرصيد',
  'ledger.currentBalance': 'الرصيد الحالي',
  'ledger.creditLimit': 'حد الائتمان',
  'ledger.available': 'المتاح',
  'ledger.dueDate': 'تاريخ الاستحقاق',
  'ledger.customers': 'العملاء',
  'ledger.outstanding': 'إجمالي المستحق',
  'ledger.overdueTotal': 'المتأخر',
  'ledger.operations': 'العمليات',
  'ledger.purchases': 'شراء',
  'ledger.payments': 'سداد',
  'ledger.noDueDate': '—',

  'status.settled': 'مسدد',
  'status.overdue': 'تجاوز الموعد',
  'status.at_limit': 'بلغ الحد',
  'status.open': 'حساب قائم',

  'payday.title': 'تاريخ الاستحقاق الموحد: كل ثلاثاء',
  'payday.note': 'يوم السداد الموحد — تجميع مرن لكل حساباتك لسهولة الدفع',

  'limit.used': 'المستهلك {percent}% من الحد',
  'limit.nearlyFull': 'اقتربت من استهلاك الحد ({percent}%) — يُنصح بالسداد',
  'limit.full': 'بلغت الحد الائتماني بالكامل — لا يمكن تسجيل مشتريات جديدة',
} as const satisfies Messages
