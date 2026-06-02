import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimiter.ts';
import {
  readBodyWithLimit, safeParseJson, sanitiseEmail, sanitisePlan,
  badRequest, internalError, buildCorsHeaders, LIMITS,
} from '../_shared/validate.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    // ── Rate limit: 5 checkout attempts per user per 15 minutes ──────────────
    const { allowed, resetInSeconds } = await checkRateLimit(
      adminClient,
      `create-checkout:${user.id}`,
      5,
      15,
    );

    if (!allowed) return rateLimitResponse(resetInSeconds);

    // ── Parse & validate body ─────────────────────────────────────────────────
    const { body: rawBody, error: sizeError } = await readBodyWithLimit(req, LIMITS.CHECKOUT_BODY);
    if (sizeError) return sizeError;

    const { data: payload, error: jsonError } = safeParseJson(rawBody, req);
    if (jsonError) return jsonError;

    const email = sanitiseEmail(payload.email ?? user.email);
    const plan  = sanitisePlan(payload.plan);

    // ── Create session ────────────────────────────────────────────────────────
    const priceId = plan === 'monthly'
      ? Deno.env.get('STRIPE_PRICE_ID_MONTHLY')!
      : Deno.env.get('STRIPE_PRICE_ID_YEARLY')!;

    if (!priceId) {
      console.error(`[create-checkout] Missing price ID for plan: ${plan}`);
      return internalError(req);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email ?? user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      // Use verified HTTPS App Links — custom schemes are interceptable by any
      // Android app and cannot be used as a secure payment redirect target.
      success_url: `https://coinseek.app/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  'https://coinseek.app/payment-cancel',
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    // VULN-06: never expose internals
    console.error('[create-checkout] unhandled error:', err);
    return internalError(req);
  }
});
