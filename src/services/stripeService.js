import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

/**
 * Creates a Stripe Checkout Session via the Supabase Edge Function.
 * Returns the Stripe-hosted checkout URL to open in a browser.
 */
/**
 * @param {'monthly'|'yearly'} plan — defaults to 'yearly'
 */
export async function createCheckoutSession(plan = 'yearly') {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { plan },
  });
  if (error) throw new Error(error.message || 'Failed to create checkout session');
  if (!data?.url) throw new Error('No checkout URL returned from server');
  return data.url;
}

/**
 * Verifies a completed Stripe Checkout Session and writes the subscription
 * record to the database. Called after the browser redirects back to the app.
 */
export async function verifySession(sessionId) {
  const { data, error } = await supabase.functions.invoke('verify-session', {
    body: { sessionId },
  });
  if (error) throw new Error(error.message || 'Payment verification failed');
  if (!data?.success) throw new Error('Payment could not be verified');
  return data;
}

/**
 * Reads the current subscription for the signed-in user directly from Supabase.
 * Used to restore premium state on app startup.
 */
export async function fetchSubscription(userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    logger.warn('fetchSubscription error:', error.message);
    return null;
  }
  return data;
}

/**
 * C-01 / M-04: Cancels the subscription on Stripe AND in the DB via a
 * server-side Edge Function. The client never writes to subscriptions directly.
 *
 * Cancellation is set to cancel_at_period_end=true (stays active until the
 * billing period ends, then Stripe fires customer.subscription.deleted webhook).
 *
 * Returns { success, access_until } — show access_until to the user so they
 * know when premium access ends.
 */
export async function cancelSubscription() {
  const { data, error } = await supabase.functions.invoke('cancel-subscription', {
    body: {},
  });
  if (error) throw new Error(error.message || 'Cancellation failed');
  if (!data?.success) throw new Error('Cancellation could not be completed');
  return data; // { success, cancel_at_period_end, access_until }
}

/**
 * Reads the user's profile row (plan + trial_started_at) from the profiles table.
 */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('plan, trial_started_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    logger.warn('fetchProfile error:', error.message);
    return null;
  }
  return data;
}

/** Formats a subscription's period end date as a readable string. */
export function formatRenewalDate(subscription) {
  if (!subscription?.current_period_end) return '—';
  return new Date(subscription.current_period_end).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
