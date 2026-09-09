import { describe, expect, it } from 'vitest'
import { describeStartupProblems, isDeployed } from '#/lib/startup'

const base = {
  appEnv: 'development',
  databaseUrl: 'file:./sejjel.db',
  authSecret: undefined,
  fakeProviders: ['otp', 'payments', 'push'],
}

const SECRET = 'a'.repeat(32)

describe('isDeployed', () => {
  it.each(['staging', 'preview', 'production'])('counts %s', (appEnv) => {
    expect(isDeployed(appEnv)).toBe(true)
  })

  it.each(['development', 'test'])('does not count %s', (appEnv) => {
    expect(isDeployed(appEnv)).toBe(false)
  })
})

describe('describeStartupProblems', () => {
  it('lets a developer run with no secret and every fake', () => {
    expect(describeStartupProblems(base)).toEqual([])
  })

  /**
   * The failure this was written for: staging came up without AUTH_SECRET, so
   * every session read threw and every page answered 500.
   */
  it('stops a deployment with no session secret, staging included', () => {
    const problems = describeStartupProblems({ ...base, appEnv: 'staging' })

    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/AUTH_SECRET is not set/)
  })

  it('stops a secret too short to be worth having', () => {
    const problems = describeStartupProblems({
      ...base,
      appEnv: 'staging',
      authSecret: 'short',
    })

    expect(problems[0]).toMatch(/needs at least 32/)
  })

  it('is satisfied by a real secret in staging, fakes and all', () => {
    expect(
      describeStartupProblems({
        ...base,
        appEnv: 'staging',
        authSecret: SECRET,
      }),
    ).toEqual([])
  })

  it('reports everything wrong with production at once', () => {
    const problems = describeStartupProblems({ ...base, appEnv: 'production' })

    expect(problems).toEqual([
      expect.stringMatching(/fake providers/),
      expect.stringMatching(/production is Turso/),
      expect.stringMatching(/AUTH_SECRET is not set/),
    ])
  })

  it('passes a production that has all three right', () => {
    expect(
      describeStartupProblems({
        appEnv: 'production',
        databaseUrl: 'libsql://sejjel.turso.io',
        authSecret: SECRET,
        fakeProviders: [],
      }),
    ).toEqual([])
  })
})
