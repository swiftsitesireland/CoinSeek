import type { WaitlistEntry } from './types'

type ValidationSuccess = WaitlistEntry
type ValidationError = { error: string }

export function validateWaitlistInput(body: unknown): ValidationSuccess | ValidationError {
  if (!body || typeof body !== 'object') return { error: 'Valid email required' }

  const { email: rawEmail, platform } = body as Record<string, unknown>
  const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : ''

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Valid email required' }
  }

  if (platform !== undefined && platform !== null && platform !== 'ios' && platform !== 'android') {
    return { error: 'Invalid platform' }
  }

  return { email, platform: (platform as 'ios' | 'android' | null) ?? null }
}
