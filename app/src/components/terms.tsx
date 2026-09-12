import { Card } from './primitives'
import { useI18n } from '#/i18n/context'
import type { TermChange } from '#/db/queries/terms'
import type { TermsAnswer } from '#/auth/terms'

/** The pieces the two settings screens share, so they say the same things. */

const FIELD =
  'w-full rounded-(--radius-control) border border-neutral-bg px-3 py-3 text-base disabled:bg-neutral-bg disabled:text-muted'
const LABEL = 'mb-1 block text-[12.5px] font-bold text-muted'

export function NumberField({
  id,
  label,
  value,
  onChange,
  disabled,
  className,
  note,
  action,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  note?: string
  action?: React.ReactNode
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <label className={LABEL} htmlFor={id}>
          {label}
        </label>
        {action}
      </div>
      <input
        id={id}
        inputMode="numeric"
        dir="ltr"
        disabled={disabled}
        className={FIELD}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
      />
      {note ? (
        <p className="mt-1 text-[11px] font-bold text-muted">{note}</p>
      ) : null}
    </div>
  )
}

export function TermsProblems({
  problems,
}: {
  problems: TermsAnswer['problems']
}) {
  const { t } = useI18n()
  if (problems.length === 0) return null

  return (
    <ul role="alert" className="mt-3 space-y-1">
      {problems.map((problem) => (
        <li key={problem} className="text-[12.5px] font-bold text-bad-text">
          {t(`settings.error.${problem}`)}
        </li>
      ))}
    </ul>
  )
}

/**
 * UC-13: who changed the terms and when. A customer's own row and the shop
 * changes that moved them read the same way, with the shop's named as such.
 */
export function TermChangeList({ changes }: { changes: Array<TermChange> }) {
  const { t, money, date } = useI18n()

  return (
    <Card>
      {changes.length === 0 ? (
        <p className="text-[12.5px] font-bold text-muted">
          {t('settings.historyEmpty')}
        </p>
      ) : (
        <ul className="space-y-2.5" data-testid="term-history">
          {changes.map((change) => (
            <li key={change.id} className="text-[12.5px] font-bold">
              <span className="text-ink">
                {change.limitBeforeHalalas !== change.limitAfterHalalas
                  ? t('settings.historyLimit', {
                      before: money(change.limitBeforeHalalas ?? 0),
                      after: money(change.limitAfterHalalas ?? 0),
                    })
                  : null}
                {change.limitBeforeHalalas !== change.limitAfterHalalas &&
                change.termBeforeDays !== change.termAfterDays
                  ? ' · '
                  : null}
                {change.termBeforeDays !== change.termAfterDays
                  ? t('settings.historyTerm', {
                      before: String(change.termBeforeDays ?? 0),
                      after: String(change.termAfterDays ?? 0),
                    })
                  : null}
              </span>
              <span className="block text-muted">
                {t('settings.historyBy', {
                  name: change.changedByName,
                  date: date(change.createdAt),
                })}
                {change.connectionId === null
                  ? ` · ${t('settings.historyShop')}`
                  : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
