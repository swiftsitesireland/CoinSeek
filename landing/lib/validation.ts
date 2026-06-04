import type { WaitlistEntry } from './types'

type ValidationSuccess = WaitlistEntry
type ValidationError = { error: string }

export function validateWaitlistInput(body: unknown): ValidationSuccess | ValidationError {
  if (!body || typeof body !== 'object') return { error: 'Valid email required' }

  const { email: rawEmail, platform, website } = body as Record<string, unknown>

  // Honeypot — bots fill this hidden field, humans never see it
  if (website) return { error: 'Valid email required' }

  const email = typeof rawEmail === 'string'
    ? rawEmail.toLowerCase().trim().replace(/\0/g, '')
    : ''

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Valid email required' }
  }

  if (platform !== undefined && platform !== null && platform !== 'ios' && platform !== 'android') {
    return { error: 'Invalid platform' }
  }

  return { email, platform: (platform as 'ios' | 'android' | null) ?? null }
}
