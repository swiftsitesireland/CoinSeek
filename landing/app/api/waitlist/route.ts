import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { validateWaitlistInput } from '@/lib/validation'
import type { WaitlistResponse } from '@/lib/types'

export async function POST(req: NextRequest): Promise<NextResponse<WaitlistResponse>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const result = validateWaitlistInput(body)

  if ('error' in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 })
  }

  const { error } = await getSupabase()
    .from('waitlist')
    .upsert({ email: result.email, platform: result.platform }, { onConflict: 'email' })

  if (error) {
    console.error('Supabase upsert error:', error.message)
    return NextResponse.json({ success: false, error: 'Failed to save. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
