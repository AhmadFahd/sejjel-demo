import { Link } from '@tanstack/react-router'
import { useI18n } from '#/i18n/context'
import { PersonGlyph } from './person-glyph'
import type { VariantDefinition } from './slots'

/**
 * PROTOTYPE — Variant E: the profile is a place, not a menu.
 *
 * The app bar goes, and what it held becomes a screen like any other: the
 * dock gains a destination, and pressing it takes you there. The rows are
 * cards, the way every other list in this app is, and you leave it the way
 * you leave any screen.
 *
 * The bet: an app with a dock has destinations, not menus. A panel that hangs
 * off a control is a third kind of surface to learn, on top of the screens and
 * the sheets; a screen is none.
 * The cost: switching language becomes a trip — away from what you were
 * reading, and back.
 */
export const variantE: VariantDefinition = {
  key: 'E',
  name: 'The profile is a screen',
  hidesAppBar: true,
  slots: { dock: DockLink, global: DesktopClearance },
}

function DockLink() {
  const { t } = useI18n()

  return (
    <Link
      to="/prototype-profile"
      data-testid="profile"
      aria-label={t('nav.profile')}
      className="flex items-center gap-2 rounded-full px-3 py-2 text-muted transition lg:px-4"
      activeProps={{ className: 'bg-ink text-white' }}
    >
      <PersonGlyph />
    </Link>
  )
}

function DesktopClearance() {
  return <div className="hidden lg:block lg:h-16" />
}
