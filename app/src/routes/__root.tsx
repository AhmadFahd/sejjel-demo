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
import type { Locale } from '#/i18n/locales'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  loader: () => loadLocale(),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: createTranslate(loaderData ?? DEFAULT_LOCALE)('appName') },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  // A loader that failed leaves this undefined, whatever the type says, and a
  // document has to render in some language even then.
  const locale: Locale | undefined = Route.useLoaderData()
  const dir = directionOf(locale ?? DEFAULT_LOCALE)

  return (
    <html lang={locale ?? DEFAULT_LOCALE} dir={dir}>
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider locale={locale ?? DEFAULT_LOCALE}>
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
