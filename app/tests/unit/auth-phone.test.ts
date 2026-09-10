import { describe, expect, it } from 'vitest'
import { fixedOtpFromEnv, normaliseSaudiMobile } from '#/auth/phone'

describe('normaliseSaudiMobile', () => {
  it.each([
    ['0550123456', '+966550123456'],
    ['0550 123 456', '+966550123456'],
    ['966550123456', '+966550123456'],
    ['+966 55 012 3456', '+966550123456'],
    ['550123456', '+966550123456'],
  ])('reads %s as %s', (typed, expected) => {
    expect(normaliseSaudiMobile(typed)).toBe(expected)
  })

  it.each([
    ['', 'nothing'],
    ['0551234', 'too short'],
    ['05501234567', 'too long'],
    ['0110123456', 'a landline'],
    ['+447700900000', 'not Saudi'],
  ])('refuses %s (%s)', (typed) => {
    expect(normaliseSaudiMobile(typed)).toBeNull()
  })
})

describe('fixedOtpFromEnv', () => {
  it('is nothing when the variable is not set', () => {
    expect(fixedOtpFromEnv({})).toBeUndefined()
  })

  it('is nothing when the variable is set to nothing', () => {
    expect(fixedOtpFromEnv({ OTP_FIXED_CODE: '  ' })).toBeUndefined()
  })

  it('reads the code, without the spaces around it', () => {
    expect(fixedOtpFromEnv({ OTP_FIXED_CODE: ' 123456 ' })).toBe('123456')
  })
})
