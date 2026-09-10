import { useRouter } from '@tanstack/react-router'
import { signOut } from '#/auth/session'
import { useI18n } from '#/i18n/context'

export function SignOutButton() {
  const { t } = useI18n()
  const router = useRouter()

  return (
    <button
      type="button"
      data-testid="sign-out"
      className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-black text-white"
      onClick={async () => {
        await signOut()
        await router.invalidate()
        await router.navigate({ to: '/sign-in' })
      }}
    >
      {t('auth.signOut')}
    </button>
  )
}
