import { describe, expect, it } from 'vitest'
import { describeEnvironment } from '#/lib/environment'

const at = new Date('2026-09-02T09:41:00.000Z')

describe('describeEnvironment', () => {
  it('reports production when the build says so', () => {
    const env = describeEnvironment({
      isProduction: true,
      nodeEnv: 'production',
      nodeVersion: 'v22.22.2',
      now: at,
    })

    expect(env).toEqual({
      mode: 'production',
      nodeEnv: 'production',
      node: 'v22.22.2',
      startedAt: '2026-09-02T09:41:00.000Z',
    })
  })

  it('says so plainly when NODE_ENV is not set', () => {
    const env = describeEnvironment({
      isProduction: false,
      nodeEnv: undefined,
      nodeVersion: 'v22.22.2',
      now: at,
    })

    expect(env.mode).toBe('development')
    expect(env.nodeEnv).toBe('unset')
  })
})
