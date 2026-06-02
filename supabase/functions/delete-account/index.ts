/**
 * delete-account — GDPR Article 17 "right to erasure" implementation.
 *
 * H-04: Required by GDPR (Ireland / EU) and App Store / Play Store policies.
 *
 * Steps:
 *   1. Authenticate the request
 *   2. Cancel any active Stripe subscription immediately
 *   3. Delete all user data from Supabase (user_coins, subscriptions, profiles)
 *   4. Delete the auth.users record — this is irreversible
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

    // ── Rate limit: 2 attempts per hour (prevents accidental rapid deletion) ──
    const { allowed, resetInSeconds } = await checkRateLimit(
      adminClient,
      `delete-account:${user.id}`,
      2,
      60,
    );
    if (!allowed) return rateLimitResponse(resetInSeconds);

    // ── Step 1: Cancel Stripe subscription if active ───────────────────────
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (sub?.stripe_subscription_id && sub.status === 'active') {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        console.log(`[delete-account] Stripe subscription canceled for user: ${user.id}`);
      } catch (stripeErr) {
        // Log but don't block deletion — subscription may already be expired
        console.error('[delete-account] Stripe cancel error:', stripeErr);
      }
    }

    // ── Step 2: Delete user data (RLS bypassed via service role) ─────────────
    // Order matters: delete child tables before parent (auth.users)
    await adminClient.from('reminder_log').delete().eq('user_id', user.id);
    await adminClient.from('daily_scans').delete().eq('user_id', user.id);
    await adminClient.from('user_coins').delete().eq('user_id', user.id);
    await adminClient.from('subscriptions').delete().eq('user_id', user.id);
    await adminClient.from('profiles').delete().eq('id', user.id);

    // ── Step 3: Delete auth record — irreversible ─────────────────────────────
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error('[delete-account] Auth delete error:', deleteAuthError.message);
      return internalError(req);
    }

    console.log(`[delete-account] Account fully deleted: ${user.id}`);

    return json({ success: true });

  } catch (err) {
    console.error('[delete-account] Unhandled error:', err);
    return internalError(req);
  }
});
