import { useEffect, useState } from 'react'
import { cx } from './primitives'
import type { ReactNode } from 'react'

export type NavItem = {
  id: string
  label: string
  icon: ReactNode
  badge?: number
  onSelect?: () => void
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
            'relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[10.5px] font-bold',
            item.id === activeId ? 'text-brand' : 'text-faint',
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
        'pointer-events-none fixed inset-x-3.5 top-4 z-90 rounded-(--radius-control) border-s-4 border-bone bg-brand px-4 py-3 text-[13px] font-bold text-white shadow-(--shadow-toast) transition',
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
        className="w-full max-w-[430px] rounded-t-3xl bg-bone p-4 pb-6"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-bg" />
        <h2 className="mb-3 text-base font-black text-ink">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export type ButtonTone =
  'primary' | 'ink' | 'bone' | 'pay' | 'soft' | 'ghost' | 'danger'

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: 'bg-brand text-white',
  ink: 'bg-brand text-white',
  bone: 'bg-bone text-brand',
  pay: 'bg-linear-135 from-good to-good-text text-white shadow-lg shadow-good/30',
  soft: 'bg-neutral-bg text-ink',
  ghost: 'border-[1.5px] border-neutral-bg bg-card text-brand',
  danger: 'bg-bad text-white',
}

/**
 * A button's look, for the places where the thing being pressed is a link:
 * going somewhere is an anchor, not a button that navigates.
 */
export function buttonClass(tone: ButtonTone = 'primary', className?: string) {
  return cx(
    'flex w-full items-center justify-center gap-2 rounded-(--radius-control) p-3.5 text-[14.5px] font-black transition active:scale-[0.98]',
    // A button that cannot be pressed has to look like one, or the only way to
    // find out is to press it.
    'disabled:opacity-50 disabled:active:scale-100',
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
