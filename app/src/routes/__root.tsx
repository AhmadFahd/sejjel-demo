import { useEffect } from 'react'
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

  /**
   * Says on the document that the client has taken over, at the first moment
   * a press does what a handler says rather than what the HTML says.
   *
   * There is a real window before this where every dock item is an ordinary
   * anchor and a field is one React has not adopted yet — #73 has it as fog,
   * because nothing measures how long it lasts. Nothing in the app behaves
   * differently for it; the browser suite waits for it, because a test that
   * touches a screen the moment its HTML arrives is testing that window
   * rather than the app, and that is what every unrepeatable failure in it
   * has turned out to be.
   *
   * Written by hand rather than rendered: React does not patch attributes on
   * `<html>` after hydration, and an effect is the moment wanted anyway.
   */
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
  }, [])

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
