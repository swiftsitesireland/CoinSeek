/**
 * export-data — GDPR Article 15 / 20 "right of access & data portability".
 *
 * Gathers everything CoinSeek stores about the authenticated user and emails a
 * machine-readable JSON copy to their registered address. Triggered from the
 * app's Privacy & Security screen ("Download My Data").
 *
 * Steps:
 *   1. Authenticate the request
 *   2. Rate limit (prevents abuse / accidental repeats)
 *   3. Collect profile, collection, scan history and subscription data
 *   4. Email the export as a JSON attachment to the user's address
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildCorsHeaders, internalError, requirePost, rejectBody } from '../_shared/validate.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimiter.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL     = 'CoinSeek <noreply@coinseek.app>';

async function sendExportEmail(to: string, json: string) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }
  // Resend accepts base64-encoded attachments. btoa handles the ASCII JSON.
  const attachment = btoa(unescape(encodeURIComponent(json)));
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Your CoinSeek data export',
      html: `<p>Hi,</p>
        <p>As requested, attached is a complete copy of the data CoinSeek holds
        about your account, in JSON format.</p>
        <p>If you didn't request this, please contact
        <a href="mailto:support@coinseek.app">support@coinseek.app</a>.</p>
        <p>— The CoinSeek team</p>`,
      attachments: [
        { filename: 'coinseek-data-export.json', content: attachment },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error: ${body}`);
  }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const methodError = requirePost(req, corsHeaders);
  if (methodError) return methodError;

  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Reject any request body — reads actual bytes, not just the Content-Length header
    const bodyError = await rejectBody(req, corsHeaders);
    if (bodyError) return bodyError;

    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // ── Rate limit: 2 exports per day ────────────────────────────────────────
    const { allowed, resetInSeconds } = await checkRateLimit(
      adminClient,
      `export-data:${user.id}`,
      2,
      60 * 24,
    );
    if (!allowed) return rateLimitResponse(resetInSeconds, corsHeaders);

    // ── Collect the user's data (RLS bypassed via service role) ──────────────
    const [profileRes, coinsRes, subRes, scansRes] = await Promise.all([
      adminClient.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      adminClient.from('user_coins').select('*').eq('user_id', user.id),
      adminClient.from('subscriptions')
        .select('status, current_period_end, created_at, updated_at')
        .eq('user_id', user.id).maybeSingle(),
      adminClient.from('daily_scans').select('*').eq('user_id', user.id),
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      profile: profileRes.data ?? null,
      collection: coinsRes.data ?? [],
      dailyScans: scansRes.data ?? [],
      subscription: subRes.data ?? null,
    };

    await sendExportEmail(user.email!, JSON.stringify(exportPayload, null, 2));

    console.log(`[export-data] Data export emailed for user: ${user.id}`);
    return json({ success: true });

  } catch (err) {
    console.error('[export-data] Unhandled error:', err);
    return internalError(req);
  }
});
