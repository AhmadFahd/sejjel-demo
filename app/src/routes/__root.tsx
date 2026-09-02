import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { I18nProvider, useI18n } from '#/i18n/context'
import { changeLocale, loadLocale } from '#/i18n/server'
import { DEFAULT_LOCALE, directionOf } from '#/i18n/locales'
import { createTranslate } from '#/i18n/translate'
import type { ReactNode } from 'react'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  loader: () => loadLocale(),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: createTranslate(loaderData ?? DEFAULT_LOCALE)('appName') },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  const locale = Route.useLoaderData()

  return (
    <html lang={locale} dir={directionOf(locale)}>
      <head>
        <HeadContent />
      </head>
      <body className="bg-white text-slate-900">
        <I18nProvider locale={locale}>
          <LocaleSwitch />
          {children}
        </I18nProvider>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

/**
 * The whole document changes direction with the language, so the switch
 * reloads the route rather than swapping strings underneath a fixed layout.
 */
function LocaleSwitch() {
  const { locale, t } = useI18n()
  const router = useRouter()

  return (
    <div className="flex justify-end p-4">
      <button
        type="button"
        className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-50"
        aria-label={t('locale.label')}
        data-testid="locale-switch"
        onClick={async () => {
          await changeLocale({ data: locale === 'ar' ? 'en' : 'ar' })
          await router.invalidate()
        }}
      >
        {t('locale.switch')}
      </button>
    </div>
  )
}
