import { useState } from 'react'
import { useI18n } from '#/i18n/context'
import { ProfileBody } from './profile-body'
import { PersonGlyph } from './person-glyph'
import type { VariantDefinition } from './slots'

/**
 * PROTOTYPE — Variant D: the dock carries the person too.
 *
 * The app bar goes and nothing replaces it: no top chrome on any signed-in
 * screen, at any width. The one floating control the app already has grows a
 * last pill for the person, and pressing it opens a panel against the dock —
 * upward on a phone, downward on a desktop, where the dock lives at the top.
 *
 * The bet: there is already exactly one place the app keeps its controls, and
 * everything the bar held belongs in it. One control to find, and the screen
 * starts at the top of the screen.
 * The cost: the panel hangs off a dock that is only as wide as its items, so
 * it has to be anchored rather than centred, and the app's name and mark are
 * nowhere on a signed-in screen.
 */
export const variantD: VariantDefinition = {
  key: 'D',
  name: 'The dock carries the person',
  hidesAppBar: true,
  slots: { dock: DockProfile, global: DesktopClearance },
}

function DockProfile() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="profile"
        aria-expanded={open}
        aria-label={t('nav.profile')}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-full px-3 py-2 transition lg:px-4 ${
          open ? 'bg-ink text-white' : 'text-muted'
        }`}
      >
        <PersonGlyph />
      </button>

      {open ? (
        <>
          {/* A press anywhere else puts it away, the way the sheets do. */}
          <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 bottom-full mb-3 w-[15.5rem] rounded-(--radius-card) border border-line bg-mist p-2 shadow-(--shadow-card) lg:top-full lg:bottom-auto lg:mt-3 lg:mb-0">
            <ProfileBody onLeave={() => setOpen(false)} />
          </div>
        </>
      ) : null}
    </div>
  )
}

/** The dock floats at the top on a desktop, and the bar used to hold it off. */
function DesktopClearance() {
  return <div className="hidden lg:block lg:h-16" />
}
