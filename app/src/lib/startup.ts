export type StartupEnvironment = {
  appEnv: string
  databaseUrl: string
  authSecret: string | undefined
  fakeProviders: Array<string>
}

/**
 * Deployed means anything that is not a developer's machine or a test run: a
 * preview and staging are deployments too, and a deployment with no session
 * secret cannot verify a session it issued.
 */
export function isDeployed(appEnv: string) {
  return appEnv !== 'development' && appEnv !== 'test'
}

const MINIMUM_SECRET_LENGTH = 32

/**
 * Everything that would otherwise be found out by a request failing. Returned
 * rather than thrown, so the caller can report all of them at once instead of
 * one per restart.
 */
export function describeStartupProblems(
  env: StartupEnvironment,
): Array<string> {
  const problems: Array<string> = []
  const production = env.appEnv === 'production'

  if (production && env.fakeProviders.length > 0) {
    problems.push(
      `fake providers in production: ${env.fakeProviders.join(', ')}`,
    )
  }

  if (production && !env.databaseUrl.startsWith('libsql://')) {
    problems.push(`production is Turso, not ${env.databaseUrl}`)
  }

  if (isDeployed(env.appEnv)) {
    if (!env.authSecret) {
      problems.push(
        'AUTH_SECRET is not set. Without it no session can be verified and every page fails',
      )
    } else if (env.authSecret.length < MINIMUM_SECRET_LENGTH) {
      problems.push(
        `AUTH_SECRET is ${env.authSecret.length} characters; it needs at least ${MINIMUM_SECRET_LENGTH}`,
      )
    }
  }

  return problems
}
