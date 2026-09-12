import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { LoadingBar } from '#/components/loading'
import { Card } from '#/components/primitives'
import { I18nProvider, useI18n } from '#/i18n/context'
import { DEFAULT_SHELL, loadShell } from '#/auth/shell'
import { ViewerProvider } from '#/auth/viewer'
import { directionOf } from '#/i18n/locales'
import { createTranslate } from '#/i18n/translate'
import { SETTLED } from '#/lib/freshness'
import type { ReactNode } from 'react'
import type { Shell } from '#/auth/shell'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  ...SETTLED,
  loader: () => loadShell(),
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      {
        title: createTranslate((loaderData ?? DEFAULT_SHELL).locale)('appName'),
      },
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
        href: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

/**
 * A page that is not there, said in the reader's language and inside the
 * app's own layout. An account belonging to someone else arrives here too:
 * it is not there for them, which is the whole answer they get.
 */
function NotFound() {
  const { t } = useI18n()

  return (
    <main className="p-3.5">
      <Card>
        <h1 className="mb-1 text-base font-black text-ink">
          {t('notFound.title')}
        </h1>
        <p className="mb-3 text-[13px] font-bold text-muted">
          {t('notFound.body')}
        </p>
        <Link to="/" className="text-[13px] font-black text-brand">
          {t('notFound.home')}
        </Link>
      </Card>
    </main>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  // A loader that failed leaves this undefined, whatever the type says, and a
  // document has to render in some language even then.
  const loaded: Shell | undefined = Route.useLoaderData()
  const shell = loaded ?? DEFAULT_SHELL

  return (
    <html lang={shell.locale} dir={directionOf(shell.locale)}>
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider locale={shell.locale} amountsHidden={shell.hideAmounts}>
          {/* #75: every screen's answer to a tap, whether or not the screen
              it is going to has a loader of its own. */}
          <LoadingBar />
          <ViewerProvider signedIn={shell.signedIn}>{children}</ViewerProvider>
        </I18nProvider>
        <TanStackDevtools
          // The bottom of the screen belongs to the dock now, so the
          // devtools handle moves out of its way.
          config={{ position: 'top-left' }}
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
