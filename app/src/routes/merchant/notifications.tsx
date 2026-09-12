import { useEffect } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { requireSideOf } from '#/auth/enter'
import { loadNotifications } from '#/auth/notifications'
import { NotificationList } from '#/components/notifications'
import { useI18n } from '#/i18n/context'

/** UC-12: everything that happened on this side, newest first. */
export const Route = createFileRoute('/merchant/notifications')({
  beforeLoad: ({ context }) => requireSideOf(context.person, 'merchant'),
  loader: () => loadNotifications(),
  component: SideNotifications,
})

function SideNotifications() {
  const entries = Route.useLoaderData()
  const { t } = useI18n()
  const router = useRouter()

  // Opening the list read everything in it, and the count is drawn by the
  // dock rather than by this screen, so the dock is asked again. The second
  // pass finds nothing unread, which is where it stops.
  useEffect(() => {
    void router.invalidate()
  }, [router])

  return (
    <main className="p-3.5">
      <Link
        to="/merchant"
        className="mb-3 inline-block text-[13px] font-black text-brand"
      >
        {t('nav.back')}
      </Link>
      <h1 className="mb-3 text-xl font-black text-ink">{t('notify.title')}</h1>

      <NotificationList entries={entries} />
    </main>
  )
}
