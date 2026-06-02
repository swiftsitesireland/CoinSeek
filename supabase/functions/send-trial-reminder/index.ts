import { createClient } from 'npm:@supabase/supabase-js@2';

// Admin client — can read auth.users
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const TRIAL_DAYS     = 7;
const FROM_EMAIL     = 'CoinSeek <noreply@coinseek.app>';

// ─── Email sender ─────────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error: ${body}`);
  }
}

// ─── 2-day reminder email ─────────────────────────────────────────────────────
function twoDayEmail(email: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a18;border-radius:16px;overflow:hidden;max-width:560px;">
        <tr><td style="background:linear-gradient(135deg,#f2ca50,#d4af37);padding:32px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">&#127825;</div>
          <h1 style="margin:0;font-size:26px;color:#1a1a18;font-weight:700;letter-spacing:-0.5px;">Your trial ends in 2 days</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 20px;font-size:16px;color:#c8c0a8;line-height:1.6;">
            Hey there &#128075; &mdash; just a heads up that your CoinSeek free trial expires in <strong style="color:#f2ca50;">2 days</strong>.
          </p>
          <p style="margin:0 0 28px;font-size:16px;color:#c8c0a8;line-height:1.6;">After your trial you'll lose access to:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a28;"><span style="color:#f2ca50;margin-right:10px;">&#10022;</span><span style="font-size:15px;color:#e5e2e1;">Unlimited daily coin scans</span></td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a28;"><span style="color:#f2ca50;margin-right:10px;">&#10022;</span><span style="font-size:15px;color:#e5e2e1;">Real-time market values</span></td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a28;"><span style="color:#f2ca50;margin-right:10px;">&#10022;</span><span style="font-size:15px;color:#e5e2e1;">Professional grading reports</span></td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid #2a2a28;"><span style="color:#f2ca50;margin-right:10px;">&#10022;</span><span style="font-size:15px;color:#e5e2e1;">Full collection analytics</span></td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://coinseek.app" style="display:inline-block;background:linear-gradient(135deg,#f2ca50,#d4af37);color:#1a1a18;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:10px;">
                Upgrade to Premium &mdash; &euro;18.99/yr
              </a>
            </td></tr>
          </table>
          <p style="margin:28px 0 0;font-size:13px;color:#666;text-align:center;line-height:1.5;">
            Or choose monthly for just &euro;1.99/month &middot; cancel anytime<br>30-day money-back guarantee
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #2a2a28;text-align:center;">
          <p style="margin:0;font-size:12px;color:#555;">
            You're receiving this because you signed up for CoinSeek with ${email}.<br>
            <a href="https://coinseek.app" style="color:#f2ca50;text-decoration:none;">coinseek.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── 1-day reminder email ─────────────────────────────────────────────────────
function oneDayEmail(email: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a18;border-radius:16px;overflow:hidden;max-width:560px;">
        <tr><td style="background:linear-gradient(135deg,#e55,#c33);padding:32px 40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">&#9200;</div>
          <h1 style="margin:0;font-size:26px;color:#fff;font-weight:700;letter-spacing:-0.5px;">Last chance &mdash; trial ends tomorrow</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 20px;font-size:16px;color:#c8c0a8;line-height:1.6;">
            Your CoinSeek free trial expires <strong style="color:#ff6b6b;">tomorrow</strong>. Don't lose access to your collection and premium features.
          </p>
          <p style="margin:0 0 28px;font-size:16px;color:#c8c0a8;line-height:1.6;">
            Upgrade now and keep everything &mdash; your full coin history, market values, and unlimited scans.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td width="48%" style="background:#222;border:2px solid #f2ca50;border-radius:10px;padding:16px;text-align:center;vertical-align:top;">
                <div style="font-size:11px;color:#f2ca50;font-weight:700;letter-spacing:1px;margin-bottom:6px;">ANNUAL &middot; BEST VALUE</div>
                <div style="font-size:28px;color:#f2ca50;font-weight:700;">&euro;18.99</div>
                <div style="font-size:13px;color:#888;">/year</div>
                <div style="font-size:11px;color:#aaa;margin-top:6px;">Just &euro;1.58/month</div>
              </td>
              <td width="4%"></td>
              <td width="48%" style="background:#1e1e1c;border:1px solid #333;border-radius:10px;padding:16px;text-align:center;vertical-align:top;">
                <div style="font-size:11px;color:#888;font-weight:700;letter-spacing:1px;margin-bottom:6px;">MONTHLY</div>
                <div style="font-size:28px;color:#e5e2e1;font-weight:700;">&euro;1.99</div>
                <div style="font-size:13px;color:#888;">/month</div>
                <div style="font-size:11px;color:#aaa;margin-top:6px;">Cancel anytime</div>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="https://coinseek.app" style="display:inline-block;background:linear-gradient(135deg,#f2ca50,#d4af37);color:#1a1a18;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:10px;">
                Upgrade Now &rarr;
              </a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:13px;color:#666;text-align:center;">
            30-day money-back guarantee &middot; no questions asked
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #2a2a28;text-align:center;">
          <p style="margin:0;font-size:12px;color:#555;">
            You're receiving this because you signed up for CoinSeek with ${email}.<br>
            <a href="https://coinseek.app" style="color:#f2ca50;text-decoration:none;">coinseek.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── L-04: Constant-time string comparison (prevents timing attacks) ──────────
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const aB = enc.encode(a);
  const bB = enc.encode(b);
  let diff = 0;
  for (let i = 0; i < aB.length; i++) diff |= aB[i] ^ bB[i];
  return diff === 0;
}

// ─── VULN-18: PII masking for logs ───────────────────────────────────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
  return `${visible}@${domain}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Only allow requests that carry the service role key — rejects public callers
  const authHeader = req.headers.get('Authorization') ?? '';
  const token      = authHeader.replace('Bearer ', '').trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!token || !timingSafeEqual(token, serviceKey)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Reject any body — this endpoint takes no input
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 0) {
    return new Response(JSON.stringify({ error: 'No body expected.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1 — Get all active premium subscribers to exclude from reminders
    const { data: premiumRows } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active');

    const premiumIds = new Set((premiumRows ?? []).map((r: any) => r.user_id));

    // M-02: pre-fetch ALL reminders sent today in one query — avoids N+1 DB calls
    const today = new Date().toISOString().slice(0, 10);
    const { data: sentTodayRows } = await supabaseAdmin
      .from('reminder_log')
      .select('user_id, type')
      .eq('sent_date', today);
    const sentToday = new Set(
      (sentTodayRows ?? []).map((r: any) => `${r.user_id}:${r.type}`)
    );

    const now     = new Date();
    let totalSent = 0;
    let page      = 1;

    // 2 — Page through all auth users
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (error) { console.error('listUsers error:', error.message); break; }
      if (!users?.length) break;

      for (const user of users) {
        if (!user.email)              continue; // no email
        if (!user.email_confirmed_at) continue; // unverified
        if (premiumIds.has(user.id))  continue; // already premium

        // Days since sign-up = trial days elapsed
        const daysSince = Math.floor(
          (now.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24),
        );
        const daysLeft = TRIAL_DAYS - daysSince;

        const reminderType = daysLeft === 2 ? '2day' : daysLeft === 1 ? '1day' : null;
        if (!reminderType) continue;

        // Idempotency check against the pre-fetched set (no extra DB query per user)
        if (sentToday.has(`${user.id}:${reminderType}`)) continue;

        const [subject, html] = reminderType === '2day'
          ? ['⏰ Your CoinSeek trial ends in 2 days', twoDayEmail(user.email)]
          : ['🚨 Last chance — your CoinSeek trial ends tomorrow', oneDayEmail(user.email)];

        await sendEmail(user.email, subject, html);

        // Record that we sent it — prevents duplicates on re-run
        await supabaseAdmin.from('reminder_log').insert({
          user_id: user.id, sent_date: today, type: reminderType,
        });

        console.log(`${reminderType} reminder sent to ${maskEmail(user.email)}`);
        totalSent++;
      }

      if (users.length < 1000) break;
      page++;
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: totalSent }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-trial-reminder error:', err);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
