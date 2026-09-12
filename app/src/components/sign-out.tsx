import { signOut } from '#/auth/session'
import { useI18n } from '#/i18n/context'

export function SignOutButton() {
  const { t } = useI18n()

  return (
    <button
      type="button"
      data-testid="sign-out"
      className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-black text-white"
      onClick={async () => {
        await signOut()
        // Signing out changes the document the same way signing in does, so
        // it leaves the same way: by loading a new one.
        window.location.assign('/sign-in')
      }}
    >
      {t('auth.signOut')}
    </button>
  )
}
