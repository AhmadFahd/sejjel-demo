import { useEffect, useState } from 'react'
import { cx } from './primitives'
import { useI18n } from '#/i18n/context'
import type { ReactNode } from 'react'

export type NavItem = {
  id: string
  label: string
  icon: ReactNode
  badge?: number
  onSelect?: () => void
}

/** The dark bar at the top: mark, name, and whatever the screen puts beside it. */
export function AppBar({ actions }: { actions?: ReactNode }) {
  const { t } = useI18n()

  return (
    <header className="flex items-center gap-2.5 bg-ink px-3.5 pt-1 pb-3.5 text-white">
      <span
        className="grid size-10 flex-none place-items-center rounded-[13px] bg-linear-135 from-gold-light via-gold to-gold-dark text-lg font-black text-ink"
        aria-hidden
      >
        {t('appName').slice(0, 1)}
      </span>
      <div>
        <div className="text-[19px] leading-none font-black">
          {t('appName')}
        </div>
        <div className="text-[10.5px] font-bold text-white/70">
          {t('appTagline')}
        </div>
      </div>
      <div className="ms-auto flex items-center gap-2">{actions}</div>
    </header>
  )
}

export function BottomNav({
  items,
  activeId,
}: {
  items: Array<NavItem>
  activeId: string
}) {
  return (
    <nav className="grid grid-flow-col border-t border-line bg-card">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={item.onSelect}
          aria-current={item.id === activeId ? 'page' : undefined}
          className={cx(
            'relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[10.5px] font-extrabold',
            item.id === activeId ? 'text-steel' : 'text-faint',
          )}
        >
          {item.icon}
          {item.badge && item.badge > 0 ? (
            <span className="absolute top-1 start-[calc(50%-22px)] grid h-4 min-w-4 place-items-center rounded-lg bg-bad px-1 text-[9.5px] font-black text-white">
              {item.badge}
            </span>
          ) : null}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

/** A message that appears, says one thing, and goes away. */
export function Toast({
  message,
  open,
  onDismiss,
  timeout = 2600,
}: {
  message: string
  open: boolean
  onDismiss?: () => void
  timeout?: number
}) {
  useEffect(() => {
    if (!open || !onDismiss) return
    const timer = setTimeout(onDismiss, timeout)
    return () => clearTimeout(timer)
  }, [open, onDismiss, timeout])

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'pointer-events-none fixed inset-x-3.5 top-4 z-90 rounded-(--radius-control) border-s-4 border-gold bg-ink px-4 py-3 text-[13px] font-extrabold text-white shadow-(--shadow-toast) transition',
        open ? 'translate-y-0 opacity-100' : '-translate-y-[160%] opacity-0',
      )}
    >
      {message}
    </div>
  )
}

/** The sheet that slides up from the bottom for a confirmation or a form. */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-100 flex items-end justify-center bg-black/40"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-[430px] rounded-t-3xl bg-mist p-4 pb-6"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-bg" />
        <h2 className="mb-3 text-base font-black text-ink">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export type ButtonTone =
  'primary' | 'ink' | 'gold' | 'pay' | 'soft' | 'ghost' | 'danger'

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: 'bg-steel text-white',
  ink: 'bg-ink text-white',
  gold: 'bg-linear-135 from-gold-light to-gold text-ink',
  pay: 'bg-linear-135 from-good to-good-text text-white shadow-lg shadow-good/30',
  soft: 'bg-neutral-bg text-ink',
  ghost: 'border-[1.5px] border-neutral-bg bg-card text-steel',
  danger: 'bg-bad text-white',
}

/**
 * A button's look, for the places where the thing being pressed is a link:
 * going somewhere is an anchor, not a button that navigates.
 */
export function buttonClass(tone: ButtonTone = 'primary', className?: string) {
  return cx(
    'flex w-full items-center justify-center gap-2 rounded-(--radius-control) p-3.5 text-[14.5px] font-black transition active:scale-[0.98]',
    BUTTON_TONES[tone],
    className,
  )
}

export function Button({
  tone = 'primary',
  className,
  ...rest
}: { tone?: ButtonTone } & React.ComponentProps<'button'>) {
  return <button className={buttonClass(tone, className)} {...rest} />
}

/** Somewhere for the gallery and the screens to keep a toast's state. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null)
  return {
    message: message ?? '',
    open: message !== null,
    show: setMessage,
    dismiss: () => setMessage(null),
  }
}
