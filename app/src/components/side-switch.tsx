import { Link } from '@tanstack/react-router'
import { useI18n } from '#/i18n/context'
import type { Roles, Side } from '#/auth/roles'

/**
 * Only for the person who is both: a shopkeeper who also owes the baker. It is
 * a link, not a toggle, because which side you are on is which screens you are
 * looking at, not a setting.
 */
export function SideSwitch({ roles, side }: { roles: Roles; side: Side }) {
  const { t } = useI18n()
  if (!roles.merchant || !roles.customer) return null

  const other = side === 'merchant' ? 'customer' : 'merchant'

  return (
    <Link
      to={other === 'merchant' ? '/merchant' : '/customer'}
      data-testid="side-switch"
      className="rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-black text-white"
    >
      {other === 'merchant'
        ? t('role.switchToMerchant')
        : t('role.switchToCustomer')}
    </Link>
  )
}
