import { useState } from 'react'
import { useI18n } from '#/i18n/context'
import { ProfileBody } from './profile-body'
import { PersonGlyph } from './person-glyph'
import type { VariantDefinition } from './slots'

/**
 * PROTOTYPE — Variant F: nothing but the person, in the corner.
 *
 * The app bar goes and leaves one round avatar floating where it used to end:
 * the top corner, which is where an account has lived on every screen anybody
 * has used. Pressing it raises the same bottom sheet the app already uses to
 * ask for anything, so the answer arrives under the thumb even though the
 * control is out of reach at the top.
 *
 * The bet: the bar was never the point — the corner was. Keep the corner,
 * drop the 64 pixels of dark it was painted on, and nothing has to be learned.
 * The cost: a floating circle over content on every screen, and it is the one
 * variant that still puts something at the top of every page.
 */
export const variantF: VariantDefinition = {
  key: 'F',
  name: 'A floating avatar in the corner',
  hidesAppBar: true,
  slots: { global: CornerAvatar },
}

function CornerAvatar() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* The avatar floats, so every screen starts below where it sits. */}
      <div className="h-14 lg:h-16" />

      <button
        type="button"
        data-testid="profile"
        aria-label={t('nav.profile')}
        onClick={() => setOpen(true)}
        className="fixed top-[max(0.75rem,env(safe-area-inset-top))] end-3.5 z-50 grid size-11 place-items-center rounded-full border border-line bg-card/90 text-muted shadow-(--shadow-card) backdrop-blur transition active:scale-95"
      >
        <PersonGlyph />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center bg-black/40"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.profile')}
            className="w-full max-w-[430px] rounded-t-3xl bg-mist p-4 pb-6"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-bg" />
            <ProfileBody onLeave={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  )
}
