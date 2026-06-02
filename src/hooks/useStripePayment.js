import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { useDispatch } from 'react-redux';
import { useAuth } from '../auth/AuthContext';
import { activatePremium } from '../store/slices/settingsSlice';
import { createCheckoutSession, verifySession } from '../services/stripeService';
import Toast from 'react-native-toast-message';

function parseSessionId(url) {
  try {
    const match = url.match(/[?&]session_id=([^&]+)/);
    if (!match) return null;
    const id = decodeURIComponent(match[1]);
    // Stripe session IDs always begin with cs_live_ or cs_test_
    if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) return null;
    return id;
  } catch {
    return null;
  }
}

export function useStripePayment() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [paymentLoading, setPaymentLoading] = useState(false);

  async function startPayment(plan = 'yearly') {
    if (!user) {
      Toast.show({ type: 'error', text1: 'Sign in required', text2: 'Please sign in to upgrade.' });
      return false;
    }

    setPaymentLoading(true);
    try {
      const checkoutUrl = await createCheckoutSession(plan);

      if (!checkoutUrl.startsWith('https://checkout.stripe.com/')) {
        Toast.show({ type: 'error', text1: 'Payment error', text2: 'Invalid checkout URL. Please contact support.' });
        return false;
      }

      // Listen for the HTTPS App Link return URL, not the custom scheme.
      // Custom schemes can be hijacked by other apps on Android.
      const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, 'https://coinseek.app');

      if (result.type === 'success' && result.url) {
        if (result.url.includes('payment-cancel')) return false;

        const sessionId = parseSessionId(result.url);
        if (!sessionId) {
          throw new Error('No session ID in redirect URL — payment could not be confirmed.');
        }

        // Server verifies payment with Stripe and writes to subscriptions table.
        // Premium state on next launch comes from useSubscription (Supabase fetch).
        await verifySession(sessionId);

        // Optimistic local update for immediate UI feedback in this session only.
        dispatch(activatePremium());

        Toast.show({
          type: 'success',
          text1: 'Welcome to Premium!',
          text2: 'All features are now unlocked.',
          visibilityTime: 4000,
        });
        return true;
      }

      return false;
    } catch (e) {
      console.error('Stripe payment error:', e.message);
      Toast.show({
        type: 'error',
        text1: 'Payment failed',
        text2: 'Please try again or contact support.',
      });
      return false;
    } finally {
      setPaymentLoading(false);
    }
  }

  return { startPayment, paymentLoading };
}
