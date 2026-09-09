import { describe, expect, it } from 'vitest'
import { describeError, formatLogLine } from '#/lib/log'

const at = new Date('2026-09-09T23:09:37.000Z')

describe('formatLogLine', () => {
  it('is one line of JSON', () => {
    const line = formatLogLine('info', 'Database ready', { seeded: 'poc' }, at)

    expect(line).not.toContain('\n')
    expect(JSON.parse(line)).toEqual({
      level: 'info',
      time: '2026-09-09T23:09:37.000Z',
      message: 'Database ready',
      seeded: 'poc',
    })
  })

  /**
   * The reason this exists: a stack trace printed as forty lines becomes forty
   * entries in the log pipeline, none of which can be read on its own.
   */
  it('keeps a stack trace inside the object rather than spread over lines', () => {
    const error = new Error('no such table: verifications')
    const line = formatLogLine('error', 'Query failed', { error }, at)

    expect(line.split('\n')).toHaveLength(1)

    const parsed = JSON.parse(line)
    expect(parsed.error.message).toBe('no such table: verifications')
    expect(parsed.error.stack).toContain('Error: no such table')
  })

  it('carries the cause of an error, which is usually the real reason', () => {
    const error = new Error('Failed query', {
      cause: new Error('no such table: verifications'),
    })

    const parsed = JSON.parse(formatLogLine('error', 'Query failed', { error }))

    expect(parsed.error.cause.message).toBe('no such table: verifications')
  })

  it('leaves out a field nobody set', () => {
    const parsed = JSON.parse(
      formatLogLine('info', 'Database ready', { seeded: undefined }),
    )

    expect('seeded' in parsed).toBe(false)
  })
})

describe('describeError', () => {
  it('says something useful about a thrown value that is not an error', () => {
    expect(describeError('nope')).toEqual({ message: 'nope' })
  })
})
