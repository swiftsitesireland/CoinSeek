import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { readBodyWithLimit, LIMITS } from '../_shared/validate.ts';

const stripe   = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  // Reject oversized payloads before reading
  const { body, error: sizeError } = await readBodyWithLimit(req, LIMITS.WEBHOOK_BODY);
  if (sizeError) return sizeError;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return new Response('Invalid webhook signature.', { status: 400 });
  }

  console.log('Stripe event received:', event.type);

  try {
    switch (event.type) {
      // ── Subscription renewed ──────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        const userId = sub.metadata?.user_id;

        if (userId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active', current_period_end: periodEnd, updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        } else {
          // Fallback: look up by stripe subscription ID
          await supabase
            .from('subscriptions')
            .update({ status: 'active', current_period_end: periodEnd, updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', sub.id);
        }
        break;
      }

      // ── Payment failed ────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', invoice.subscription as string);
        break;
      }

      // ── Subscription cancelled / expired ──────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      // ── Subscription updated (e.g. plan change or cancel scheduled) ─────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

        // C-01: if cancel_at_period_end=true the user is still paying until
        // period ends — keep status 'active' so they don't lose access early.
        // The status only becomes 'canceled' when customer.subscription.deleted fires.
        const status = (sub.status === 'active' || sub.cancel_at_period_end)
          ? 'active'
          : sub.status;

        await supabase
          .from('subscriptions')
          .update({ status, current_period_end: periodEnd, updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
