import { Link, createFileRoute } from '@tanstack/react-router'
import { useI18n } from '#/i18n/context'
import { ProfileBody } from '#/prototype/no-app-bar/profile-body'

/**
 * PROTOTYPE (no-app-bar, variant E). The profile as a screen of its own.
 * Throwaway: it exists to be looked at beside the other two answers, and goes
 * with them.
 */
export const Route = createFileRoute('/prototype-profile')({
  component: ProfileScreen,
})

function ProfileScreen() {
  const { t } = useI18n()

  return (
    <main className="mx-auto max-w-md p-3.5">
      <Link
        to="/"
        className="mb-3 inline-block text-[13px] font-black text-steel"
      >
        {t('nav.back')}
      </Link>
      <h1 className="mb-3 text-xl font-black text-ink">{t('nav.profile')}</h1>
      <ProfileBody />
    </main>
  )
}
