/**
 * cancel-subscription — server-side subscription cancellation.
 *
 * C-01 / M-04: The client NEVER writes to the subscriptions table directly.
 * This function:
 *   1. Verifies the authenticated user owns the subscription
 *   2. Calls stripe.subscriptions.cancel() so Stripe stops charging
 *   3. Updates the DB record — the webhook will also fire and confirm it
 */

import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildCorsHeaders, internalError } from '../_shared/validate.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimiter.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // ── Rate limit: 3 cancel attempts per user per hour ───────────────────────
    const { allowed, resetInSeconds } = await checkRateLimit(
      adminClient,
      `cancel-subscription:${user.id}`,
      3,
      60,
    );
    if (!allowed) return rateLimitResponse(resetInSeconds);

    // ── Load subscription from DB ─────────────────────────────────────────────
    const { data: sub, error: dbError } = await adminClient
      .from('subscriptions')
      .select('id, stripe_subscription_id, status, user_id')
      .eq('user_id', user.id)   // ownership enforced server-side, not client-side
      .maybeSingle();

    if (dbError) {
      console.error('[cancel-subscription] DB error:', dbError.message);
      return internalError(req);
    }

    if (!sub) {
      return json({ error: 'No active subscription found.' }, 404);
    }

    if (sub.status === 'canceled') {
      return json({ error: 'Subscription is already canceled.' }, 409);
    }

    if (!sub.stripe_subscription_id) {
      console.error('[cancel-subscription] Missing stripe_subscription_id for user:', user.id);
      return internalError(req);
    }

    // ── Cancel on Stripe ──────────────────────────────────────────────────────
    // cancel_at_period_end: true — user keeps access until the period they paid for ends.
    // C-01: We do NOT update the DB here. The Stripe webhook fires
    // customer.subscription.updated (sets cancel_at_period_end flag) and later
    // customer.subscription.deleted (sets status=canceled when access truly ends).
    // Letting the webhook own the DB state prevents premature access revocation.
    const stripeSub = await stripe.subscriptions.update(
      sub.stripe_subscription_id,
      { cancel_at_period_end: true },
    );

    console.log(`[cancel-subscription] Scheduled cancellation for user: ${user.id}`);

    return json({
      success:              true,
      cancel_at_period_end: stripeSub.cancel_at_period_end,
      // ISO date when access ends — show this to the user
      access_until:         new Date(stripeSub.current_period_end * 1000).toISOString(),
    });

  } catch (err) {
    console.error('[cancel-subscription] unhandled error:', err);
    return internalError(req);
  }
});
