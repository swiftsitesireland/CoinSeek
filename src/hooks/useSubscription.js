import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../auth/AuthContext';
import { selectSettings, activatePremium, deactivatePremium } from '../store/slices/settingsSlice';
import { fetchSubscription, fetchProfile } from '../services/stripeService';
import { logger } from '../utils/logger';

/**
 * Fetches the user's subscription from Supabase and keeps Redux in sync.
 * Falls back to Redux state (which may have been set locally) when offline.
 */
export function useSubscription() {
  const { user } = useAuth();
  const dispatch  = useDispatch();
  const settings  = useSelector(selectSettings);

  const [subscription, setSubscription] = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);

  const refetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setLoading(true);
      const [sub, prof] = await Promise.all([
        fetchSubscription(user.id),
        fetchProfile(user.id),
      ]);
      setSubscription(sub);
      setProfile(prof);
      // H-01: always sync Redux — activate OR deactivate based on live DB
      if (sub?.plan === 'premium' && sub?.status === 'active') {
        dispatch(activatePremium());
      } else {
        dispatch(deactivatePremium());
      }
    } catch (e) {
      logger.warn('useSubscription fetch error:', e.message);
      // On any network or server failure, remove premium state rather than
      // silently leaving it active. The next successful refetch restores it.
      dispatch(deactivatePremium());
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Check subscription on mount and every time the app returns to foreground
  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  // Derive state — prefer live DB data, fall back to Redux
  const isPremium = settings.isPremium ||
    (subscription?.plan === 'premium' && subscription?.status === 'active');

  // VULN-13: use server-sourced trial_started_at so trial can't be reset by reinstalling
  const trialStart = profile?.trial_started_at ? new Date(profile.trial_started_at) : null;
  const daysSinceTrial = trialStart
    ? Math.floor((Date.now() - trialStart.getTime()) / 86_400_000)
    : 0;
  const daysLeft      = Math.max(0, 7 - daysSinceTrial);
  const isFreeTrial   = !isPremium && daysLeft > 0;
  const hasSubscription = isPremium || isFreeTrial;

  return {
    subscription,
    loading,
    isFreeTrial,
    isPremium,
    isExpired:    !hasSubscription,
    isCanceled:   subscription?.status === 'canceled',
    hasSubscription,
    daysLeft,
    refetch,
  };
}
