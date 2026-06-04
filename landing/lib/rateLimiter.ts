import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Production: Upstash Redis (persists across serverless instances)
// Local dev: falls back to in-memory (set UPSTASH_* env vars to use Redis locally too)
let ratelimit: Ratelimit | null = null

function getUpstashLimiter(): Ratelimit | null {
  if (ratelimit) return ratelimit
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'coinseek:waitlist',
  })
  return ratelimit
}

// In-memory fallback — only works on a single warm instance (local dev only)
const store = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60 * 1000
const MAX = 5

function inMemoryCheck(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }
  if (entry.count >= MAX) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true }
}

export async function checkRateLimit(key: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const rl = getUpstashLimiter()
  if (rl) {
    const { success, reset } = await rl.limit(key)
    return {
      allowed: success,
      retryAfterSeconds: success ? undefined : Math.ceil((reset - Date.now()) / 1000),
    }
  }
  // Fallback — logs a warning so it's obvious in production if Upstash is not configured
  if (process.env.NODE_ENV === 'production') {
    console.warn('[rate-limit] UPSTASH_REDIS_REST_URL not set — rate limiting is inactive in production')
  }
  return inMemoryCheck(key)
}
