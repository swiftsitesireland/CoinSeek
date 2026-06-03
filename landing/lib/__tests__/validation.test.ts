import { validateWaitlistInput } from '../validation'

describe('validateWaitlistInput', () => {
  it('accepts valid email with no platform', () => {
    expect(validateWaitlistInput({ email: 'test@example.com' }))
      .toEqual({ email: 'test@example.com', platform: null })
  })

  it('accepts valid email with ios platform', () => {
    expect(validateWaitlistInput({ email: 'user@test.com', platform: 'ios' }))
      .toEqual({ email: 'user@test.com', platform: 'ios' })
  })

  it('accepts valid email with android platform', () => {
    expect(validateWaitlistInput({ email: 'user@test.com', platform: 'android' }))
      .toEqual({ email: 'user@test.com', platform: 'android' })
  })

  it('accepts null platform explicitly', () => {
    expect(validateWaitlistInput({ email: 'test@example.com', platform: null }))
      .toEqual({ email: 'test@example.com', platform: null })
  })

  it('lowercases and trims email', () => {
    expect(validateWaitlistInput({ email: '  TEST@EXAMPLE.COM  ' }))
      .toEqual({ email: 'test@example.com', platform: null })
  })

  it('rejects missing email', () => {
    expect(validateWaitlistInput({})).toEqual({ error: 'Valid email required' })
  })

  it('rejects invalid email format', () => {
    expect(validateWaitlistInput({ email: 'notanemail' }))
      .toEqual({ error: 'Valid email required' })
  })

  it('rejects invalid platform value', () => {
    expect(validateWaitlistInput({ email: 'test@example.com', platform: 'windows' }))
      .toEqual({ error: 'Invalid platform' })
  })
})
