import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';

import { useAuth } from '../auth/AuthContext';
import { useStripePayment } from '../hooks/useStripePayment';
import { useSubscription } from '../hooks/useSubscription';
import { selectCollection, selectCollectionTotal } from '../store/slices/collectionSlice';
import { selectScansUsedToday, selectCurrency } from '../store/slices/settingsSlice';
import { formatCurrency } from '../utils/currency';
import { colors, spacing, borderRadius, fonts, typography, shadows } from '../theme';

// ─── Pricing ──────────────────────────────────────────────────────────────────
const MONTHLY_PRICE  = 1.99;
const YEARLY_PRICE   = 18.99;
const YEARLY_EQUIV   = +(MONTHLY_PRICE * 12).toFixed(2);
const SAVINGS_AMOUNT = +(YEARLY_EQUIV - YEARLY_PRICE).toFixed(2);
const SAVINGS_PCT    = Math.round((SAVINGS_AMOUNT / YEARLY_EQUIV) * 100);

// ─── Features — outcome-focused, not feature-focused ─────────────────────────
const PREMIUM_FEATURES = [
  { icon: 'infinity',            text: 'Unlimited scans — identify as many coins as you find' },
  { icon: 'cash-multiple',       text: 'Real market value for every coin in your collection'  },
  { icon: 'certificate-outline', text: 'Detailed grade & condition analysis for every coin'   },
  { icon: 'chart-line-variant',  text: 'Track your collection value growing over time'        },
  { icon: 'folder-multiple',     text: 'Full collection management with notes and history'    },
];

function FeatureRow({ icon, text }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <MaterialCommunityIcons name={icon} size={14} color={colors.onPrimary} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

export default function PlanSelectionScreen({ onDismiss }) {
  const { user }                        = useAuth();
  const { startPayment, paymentLoading } = useStripePayment();
  const { daysLeft }                    = useSubscription();
  const [billingCycle,  setBillingCycle]  = useState('yearly');
  const [loadingFree,   setLoadingFree]   = useState(false);

  // ─── Personalisation data ────────────────────────────────────────────────────
  const collection   = useSelector(selectCollection);
  const totalValue   = useSelector(selectCollectionTotal);
  const scansToday   = useSelector(selectScansUsedToday);
  const currency     = useSelector(selectCurrency);
  const coinCount    = collection.length;
  const isYearly     = billingCycle === 'yearly';
  const trialActive  = daysLeft > 0;

  // Build a personalised headline based on what the user has done
  function getHeroLine() {
    if (coinCount > 0 && totalValue > 0) {
      return `You have ${coinCount} coin${coinCount > 1 ? 's' : ''} worth ~${formatCurrency(totalValue, currency)}`;
    }
    if (scansToday > 0) {
      return `You've already scanned ${scansToday} coin${scansToday > 1 ? 's' : ''} today`;
    }
    return 'Your collection is waiting to be valued';
  }

  // ─── Free trial ─────────────────────────────────────────────────────────────
  async function handleFreeTrial() {
    if (!user) return;
    setLoadingFree(true);
    try {
      await SecureStore.deleteItemAsync('coinseek_needs_plan_selection');
      Toast.show({ type: 'success', text1: 'Trial started!', text2: '7 days of free access — enjoy 🎉' });
      onDismiss?.();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not start trial', text2: 'Please try again.' });
    } finally {
      setLoadingFree(false);
    }
  }

  // ─── Premium via Stripe Checkout ─────────────────────────────────────────────
  async function handlePremium() {
    const plan = isYearly ? 'yearly' : 'monthly';
    const success = await startPayment(plan);
    if (success) {
      await SecureStore.deleteItemAsync('coinseek_needs_plan_selection');
      onDismiss?.();
    }
  }

  // ─── No thanks ───────────────────────────────────────────────────────────────
  async function handleNoThanks() {
    await SecureStore.deleteItemAsync('coinseek_needs_plan_selection');
    onDismiss?.();
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Personalised hero ──────────────────────────────────────────── */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.logoCircle}
          >
            <MaterialCommunityIcons name="crown" size={28} color={colors.onPrimary} />
          </LinearGradient>

          <Text style={styles.heroLine}>{getHeroLine()}</Text>
          <Text style={styles.headline}>Unlock Premium to see it all</Text>

          {/* Trial countdown — only show if trial is active */}
          {trialActive && (
            <View style={styles.trialPill}>
              <MaterialCommunityIcons name="clock-outline" size={13} color={colors.warning} />
              <Text style={styles.trialPillText}>
                Free trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* ── Premium card ────────────────────────────────────────────────── */}
        <View style={styles.premiumCard}>

          {/* Most popular badge */}
          <View style={styles.popularBadge}>
            <MaterialCommunityIcons name="fire" size={11} color={colors.onPrimary} />
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>

          {/* Billing toggle */}
          <View style={styles.toggleWrap}>
            <TouchableOpacity
              style={[styles.toggleBtn, !isYearly && styles.toggleBtnActive]}
              onPress={() => setBillingCycle('monthly')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleBtnText, !isYearly && styles.toggleBtnTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, isYearly && styles.toggleBtnActive]}
              onPress={() => setBillingCycle('yearly')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleBtnText, isYearly && styles.toggleBtnTextActive]}>
                Yearly
              </Text>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsBadgeText}>Save {SAVINGS_PCT}%</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Price */}
          {isYearly ? (
            <View style={styles.priceBlock}>
              <View style={styles.priceRow}>
                <Text style={styles.priceMain}>€{YEARLY_PRICE}</Text>
                <Text style={styles.priceSub}> / year</Text>
              </View>
              <Text style={styles.priceEquiv}>
                Just €{(YEARLY_PRICE / 12).toFixed(2)}/month · save €{SAVINGS_AMOUNT} vs monthly
              </Text>
            </View>
          ) : (
            <View style={styles.priceBlock}>
              <View style={styles.priceRow}>
                <Text style={styles.priceMain}>€{MONTHLY_PRICE.toFixed(2)}</Text>
                <Text style={styles.priceSub}> / month</Text>
              </View>
              <Text style={styles.priceEquiv}>
                Switch to yearly and save €{SAVINGS_AMOUNT} — that's {SAVINGS_PCT}% off
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Feature list */}
          <View style={styles.featureList}>
            {PREMIUM_FEATURES.map((f) => <FeatureRow key={f.text} icon={f.icon} text={f.text} />)}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.premiumBtn, paymentLoading && { opacity: 0.6 }]}
            onPress={handlePremium}
            disabled={loadingFree || paymentLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#f2ca50', '#d4af37']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.premiumBtnGradient}
            >
              {paymentLoading
                ? <ActivityIndicator size="small" color={colors.onPrimary} />
                : (
                  <View style={styles.btnInner}>
                    <MaterialCommunityIcons name="crown" size={16} color={colors.onPrimary} />
                    <Text style={styles.premiumBtnText}>
                      Get Premium · {isYearly ? `€${YEARLY_PRICE}/yr` : `€${MONTHLY_PRICE.toFixed(2)}/mo`}
                    </Text>
                  </View>
                )
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Trust */}
          <View style={styles.trust}>
            <MaterialCommunityIcons name="shield-check-outline" size={13} color={colors.textMuted} />
            <Text style={styles.trustText}>30-day money-back · cancel anytime · no hidden fees</Text>
          </View>
        </View>

        {/* ── Free trial link — subtle, not a full card ───────────────────── */}
        {!trialActive && (
          <TouchableOpacity
            style={styles.trialLink}
            onPress={handleFreeTrial}
            disabled={loadingFree || paymentLoading}
            activeOpacity={0.7}
          >
            {loadingFree
              ? <ActivityIndicator size="small" color={colors.textMuted} />
              : <Text style={styles.trialLinkText}>Start free 7-day trial instead</Text>
            }
          </TouchableOpacity>
        )}

        {/* ── No thanks — very subtle ─────────────────────────────────────── */}
        <TouchableOpacity style={styles.noThanksBtn} onPress={handleNoThanks} activeOpacity={0.7}>
          <Text style={styles.noThanksText}>No thanks</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.edge, paddingTop: 56, paddingBottom: 24 },

  // Hero
  hero:     { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.sm },
  logoCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  heroLine:   { fontFamily: fonts.sansBold, fontSize: 14, color: colors.primary, textAlign: 'center' },
  headline:   { ...typography.headlineMd, textAlign: 'center' },

  trialPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(251,146,60,0.12)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(251,146,60,0.3)',
  },
  trialPillText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.warning },

  // Premium card
  premiumCard: {
    backgroundColor: '#1e1a0e',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadows.gold,
  },

  popularBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  popularBadgeText: { fontFamily: fonts.sansBold, fontSize: 10, color: colors.onPrimary, letterSpacing: 0.5 },

  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.full,
    padding: 4,
    gap: 4,
  },
  toggleBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: borderRadius.full, gap: 6 },
  toggleBtnActive:     { backgroundColor: colors.primary },
  toggleBtnText:       { fontFamily: fonts.sansBold, fontSize: 13, color: colors.textMuted },
  toggleBtnTextActive: { color: colors.onPrimary },

  savingsBadge:     { backgroundColor: 'rgba(74,222,128,0.2)', borderRadius: borderRadius.full, paddingHorizontal: 7, paddingVertical: 2 },
  savingsBadgeText: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.success, letterSpacing: 0.3 },

  priceBlock:   { gap: 4 },
  priceRow:     { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  priceMain:    { fontFamily: fonts.sansExtraBold, fontSize: 36, color: colors.primary },
  priceSub:     { fontFamily: fonts.sans, fontSize: 15, color: colors.textVariant },
  priceEquiv:   { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, lineHeight: 16 },

  divider: { height: 1, backgroundColor: 'rgba(242,202,80,0.2)', marginVertical: spacing.xs },

  featureList: { gap: 12 },
  featureRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureIconWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  featureText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textVariant, flex: 1, lineHeight: 20 },

  premiumBtn:         { borderRadius: borderRadius.md, overflow: 'hidden', marginTop: spacing.xs },
  premiumBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  premiumBtnText:     { fontFamily: fonts.sansBold, fontSize: 15, color: colors.onPrimary },
  btnInner:           { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  trustText: { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted },

  // Free trial link — subtle, secondary option
  trialLink: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  trialLinkText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' },

  noThanksBtn:  { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  noThanksText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' },
});
