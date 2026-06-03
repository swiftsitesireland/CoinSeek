import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimiter.ts';
import {
  readBodyWithLimit, safeParseJson, sanitiseSessionId,
  badRequest, internalError, buildCorsHeaders, rejectUnexpectedFields, requirePost, LIMITS,
} from '../_shared/validate.ts';

const stripe   = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const methodError = requirePost(req, corsHeaders);
  if (methodError) return methodError;

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    // ── Rate limit: 10 verification attempts per user per 15 minutes ──────────
    const { allowed, resetInSeconds } = await checkRateLimit(
      supabase,
      `verify-session:${user.id}`,
      10,
      15,
    );

    if (!allowed) return rateLimitResponse(resetInSeconds, corsHeaders);

    // ── Parse & validate body ─────────────────────────────────────────────────
    const { body: rawBody, error: sizeError } = await readBodyWithLimit(req, LIMITS.VERIFY_BODY);
    if (sizeError) return sizeError;

    const { data: payload, error: jsonError } = safeParseJson(rawBody, req);
    if (jsonError) return jsonError;

    // Reject unknown fields — only sessionId is expected
    const fieldError = rejectUnexpectedFields(payload, ['sessionId'], req);
    if (fieldError) return fieldError;

    const sessionId = sanitiseSessionId(payload.sessionId);
    if (!sessionId) return badRequest('Invalid or missing sessionId.', req);

    // ── Verify with Stripe ────────────────────────────────────────────────────

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ error: 'Payment not completed' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Ensure the session belongs to this user — fail closed if metadata is absent
    if (session.metadata?.user_id !== user.id) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    const sub = session.subscription as Stripe.Subscription;
    const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id:                user.id,
          stripe_customer_id:     session.customer as string,
          stripe_subscription_id: sub.id,
          plan:                   'premium',
          status:                 'active',
          current_period_end:     periodEnd,
          updated_at:             new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ success: true, current_period_end: periodEnd }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    // VULN-06: never expose internals
    console.error('[verify-session] unhandled error:', err);
    return internalError(req);
  }
});
