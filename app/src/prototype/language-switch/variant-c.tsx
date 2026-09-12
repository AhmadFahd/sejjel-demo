import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { LOCALE_COOKIE } from '#/i18n/server'
import { useLocaleSwitch } from './use-locale-switch'
import type { VariantDefinition } from './slots'

/**
 * PROTOTYPE — Variant C: asked once at the door, a setting ever after.
 *
 * The premise the other two share is that the language is a control. This one
 * says it is a decision: made once, on the first screen, and then it belongs
 * with the other things you set and forget.
 *
 * So a first-time visitor — nobody whose choice we already hold — is offered
 * the other language once, in a strip they can take or dismiss, and that is
 * the last prominent mention of it. Afterwards it lives in the small print of
 * the public pages and behind the account button when signed in.
 *
 * The bet: the loudest possible offer at the one moment it matters buys the
 * right to be quiet everywhere else.
 * The cost: a returning visitor who wants to change their mind has to go
 * looking, and on a signed-in screen that is two taps in a sheet.
 */
export const variantC: VariantDefinition = {
  key: 'C',
  name: 'Asked once, then a setting',
  slots: {
    global: FirstVisitOffer,
    'marketing-footer': SmallPrintLink,
    'signin-sheet': SmallPrintLink,
    appbar: AccountSheetEntry,
  },
}

/**
 * Shown to somebody who has never said, and to nobody else: a signed-in person
 * has a language on their row, and the whole point of this variant is that the
 * question is asked once. The cookie is the only record this prototype reads,
 * and it is read on the client, so the strip is not in the server's first
 * paint for the people who must not see it.
 *
 * It sits in the flow rather than over the page. It is a band, and it is
 * honest about it — it just never comes back.
 */
function FirstVisitOffer() {
  const { label, switchNow } = useLocaleSwitch()
  const [state, setState] = useState<'unknown' | 'offer' | 'gone'>('unknown')
  const signedIn = useRouterState({
    select: (router) =>
      /^\/(customer|merchant|welcome)/.test(router.location.pathname),
  })

  useEffect(() => {
    const chosen = document.cookie
      .split(';')
      .some((pair) => pair.trim().startsWith(`${LOCALE_COOKIE}=`))
    setState(chosen ? 'gone' : 'offer')
  }, [])

  if (signedIn || state !== 'offer') return null

  return (
    <div className="flex items-center justify-center gap-3 bg-ink px-4 py-2 text-white">
      <button
        type="button"
        data-testid="locale-switch"
        onClick={() => void switchNow()}
        className="rounded-full bg-white px-4 py-1 text-[12.5px] font-black text-ink"
      >
        {label}
      </button>
      <button
        type="button"
        aria-label="dismiss"
        onClick={() => setState('gone')}
        className="text-[15px] font-black text-white/60"
      >
        ✕
      </button>
    </div>
  )
}

/** Where the terms line and the copyright live: chosen, not stumbled upon. */
function SmallPrintLink() {
  const { label, ariaLabel, switchNow } = useLocaleSwitch()

  return (
    <button
      type="button"
      data-testid="locale-switch"
      aria-label={ariaLabel}
      onClick={() => void switchNow()}
      className="text-[12px] font-black text-muted underline underline-offset-2"
    >
      {label}
    </button>
  )
}

/**
 * The AppBar keeps one button for everything about the person rather than one
 * per setting. The sheet is drawn here rather than borrowed from the app's
 * chrome: a prototype that reaches into the real components ends up changing
 * them.
 */
function AccountSheetEntry() {
  const { label, ariaLabel, switchNow } = useLocaleSwitch()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        data-testid="account-menu"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className="grid size-8 place-items-center rounded-full bg-white/15 text-[13px] font-black text-white"
      >
        ⋯
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center bg-black/40"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div className="w-full max-w-[430px] rounded-t-3xl bg-mist p-4 pb-6 text-ink">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-bg" />
            <h2 className="mb-3 text-base font-black">{ariaLabel}</h2>
            <button
              type="button"
              data-testid="locale-switch"
              onClick={() => void switchNow()}
              className="flex w-full items-center justify-between rounded-(--radius-control) bg-card p-3.5 text-[14px] font-black"
            >
              <span>{ariaLabel}</span>
              <span className="text-steel">{label}</span>
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
