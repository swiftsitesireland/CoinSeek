import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabase } from '@/lib/supabase'
import { validateWaitlistInput } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rateLimiter'
import type { WaitlistResponse } from '@/lib/types'

const MAX_BODY_BYTES = 512

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Coin Seek <noreply@coincollector.app>'

async function sendConfirmationEmail(to: string): Promise<void> {
  if (!resend) return
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "You're on the Coin Seek waitlist",
    html: `
      <div style="font-family:monospace;background:#0d0d0d;color:#fff;padding:40px;max-width:480px;margin:0 auto">
        <p style="color:#FFB800;font-size:11px;letter-spacing:2px;margin-bottom:24px">// COIN COLLECTOR</p>
        <h1 style="font-size:28px;font-weight:900;letter-spacing:-1px;margin:0 0 12px">You&rsquo;re on the list.</h1>
        <p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 32px">
          We&rsquo;ll email you the moment the app goes live. No spam, ever &mdash; just the launch notification.
        </p>
        <div style="border-top:1px solid rgba(255,184,0,0.15);padding-top:20px">
          <p style="color:#555;font-size:11px;letter-spacing:1px;margin:0">
            If you didn&rsquo;t sign up for this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
    text: `You're on the Coin Seek waitlist.\n\nWe'll email you the moment the app goes live. No spam, ever.\n\nIf you didn't sign up for this, you can safely ignore this email.`,
  })
}

const ALLOWED_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null)

function corsHeaders(origin: string | null): Record<string, string> {
  if (!ALLOWED_ORIGIN || origin !== ALLOWED_ORIGIN) return {}
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function POST(req: NextRequest): Promise<NextResponse<WaitlistResponse>> {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ success: false, error: 'Unsupported content type' }, { status: 415, headers: cors })
  }

  // Take the LAST IP from x-forwarded-for — Vercel appends the real client IP,
  // so attackers who prepend fake IPs can't influence this value.
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',').at(-1)!.trim()
    : (req.headers.get('x-real-ip') ?? 'unknown')

  const rate = await checkRateLimit(ip)
  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: `Too many requests. Try again in ${rate.retryAfterSeconds}s.` },
      { status: 429, headers: { ...cors, 'Retry-After': String(rate.retryAfterSeconds) } }
    )
  }

  // Stream body — reject as soon as we exceed the size limit
  let text = ''
  try {
    if (!req.body) throw new Error('No body')
    const reader = req.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: !done })
      if (text.length > MAX_BODY_BYTES) {
        reader.cancel()
        return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413, headers: cors })
      }
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400, headers: cors })
  }

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400, headers: cors })
  }

  const result = validateWaitlistInput(body)
  if ('error' in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400, headers: cors })
  }

  const { error } = await getSupabase()
    .from('waitlist')
    .upsert({ email: result.email, platform: result.platform }, { onConflict: 'email' })

  if (error) {
    // Log only error code — never log error.message/details which can leak schema info
    console.error('[waitlist] upsert failed', { code: error.code })
    return NextResponse.json({ success: false, error: 'Failed to save. Try again.' }, { status: 500, headers: cors })
  }

  sendConfirmationEmail(result.email).catch(() => {
    console.error('[waitlist] confirmation email failed for', result.email.slice(0, 3) + '***')
  })

  return NextResponse.json({ success: true }, { headers: cors })
}
