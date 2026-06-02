import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSelector } from 'react-redux';
import { colors, fonts, spacing, borderRadius } from '../theme';
import { selectCollection, selectCollectionTotal } from '../store/slices/collectionSlice';
import { selectCurrency } from '../store/slices/settingsSlice';
import { formatCurrency } from '../utils/currency';

// Context-specific hooks — shown above the feature list based on what the
// user was trying to do when the paywall triggered.
const CONTEXT_HOOKS = {
  'Market Value':      { icon: 'cash-multiple',       hook: 'See the real market value of every coin you own'   },
  'AI Analysis':       { icon: 'brain',                hook: 'Get a full AI breakdown of every coin you scan'    },
  'Rarity Assessment': { icon: 'diamond-stone',        hook: 'Find out exactly how rare your coins really are'   },
  'Value Trends':      { icon: 'chart-line-variant',   hook: 'Track how your collection value changes over time' },
  'Unlimited Scans':   { icon: 'infinity',             hook: 'Scan as many coins as you find — no daily limits'  },
  default:             { icon: 'crown',                hook: 'Unlock every premium feature in one tap'           },
};

const BENEFITS = [
  { icon: 'infinity',            text: 'Unlimited daily scans'                        },
  { icon: 'cash-multiple',       text: 'Real market value for every coin'             },
  { icon: 'certificate-outline', text: 'Detailed grade & condition analysis'           },
  { icon: 'chart-line-variant',  text: 'Full collection management & history'          },
];

const PLANS = [
  {
    key:    'yearly',
    label:  'Annual',
    price:  '€18.99',
    period: '/year',
    sub:    'Just €1.58/month',
    badge:  'BEST VALUE',
  },
  {
    key:    'monthly',
    label:  'Monthly',
    price:  '€1.99',
    period: '/month',
    sub:    'Cancel anytime',
    badge:  null,
  },
];

export default function UpgradeModal({ visible, featureName, onContinue, onClose, loading = false }) {
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  // Personalisation — pull real user data to make the hook specific to them
  const collection = useSelector(selectCollection);
  const totalValue = useSelector(selectCollectionTotal);
  const currency   = useSelector(selectCurrency);
  const coinCount  = collection.length;

  const context    = CONTEXT_HOOKS[featureName] ?? CONTEXT_HOOKS.default;
  const activePlan = PLANS.find(p => p.key === selectedPlan);

  // Build a personalised sub-line under the hook
  function getPersonalisedLine() {
    if (coinCount > 0 && totalValue > 0) {
      return `Your ${coinCount} coin${coinCount > 1 ? 's' : ''} could be worth ~${formatCurrency(totalValue, currency)}`;
    }
    if (coinCount > 0) {
      return `You have ${coinCount} coin${coinCount > 1 ? 's' : ''} waiting to be valued`;
    }
    return 'Join thousands of collectors who already use Premium';
  }

  function handleContinue() {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContinue?.(selectedPlan);
  }

  function selectPlan(key) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlan(key);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>

          {/* Context icon */}
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <MaterialCommunityIcons name={context.icon} size={26} color={colors.onPrimary} />
          </LinearGradient>

          {/* Context-specific hook */}
          <Text style={styles.title}>{context.hook}</Text>
          <Text style={styles.sub}>{getPersonalisedLine()}</Text>

          {/* Benefits */}
          <View style={styles.benefits}>
            {BENEFITS.map(b => (
              <View key={b.text} style={styles.benefit}>
                <View style={styles.benefitIcon}>
                  <MaterialCommunityIcons name={b.icon} size={15} color={colors.primary} />
                </View>
                <Text style={styles.benefitText}>{b.text}</Text>
                <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
              </View>
            ))}
          </View>

          {/* Plan toggle */}
          <View style={styles.planRow}>
            {PLANS.map(plan => {
              const active = selectedPlan === plan.key;
              return (
                <TouchableOpacity
                  key={plan.key}
                  style={[styles.planCard, active && styles.planCardActive]}
                  onPress={() => selectPlan(plan.key)}
                  activeOpacity={0.82}
                >
                  {plan.badge && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <View style={[styles.planRadio, active && styles.planRadioActive]}>
                    {active && <View style={styles.planRadioDot} />}
                  </View>
                  <Text style={[styles.planLabel, active && styles.planLabelActive]}>
                    {plan.label}
                  </Text>
                  <Text style={[styles.planPrice, active && styles.planPriceActive]}>
                    {plan.price}
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </Text>
                  <Text style={styles.planSub}>{plan.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Trust */}
          <View style={styles.trust}>
            <MaterialCommunityIcons name="shield-check-outline" size={13} color={colors.textMuted} />
            <Text style={styles.trustText}>30-day money-back · cancel anytime</Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleContinue}
            activeOpacity={loading ? 1 : 0.88}
            style={[styles.cta, loading && { opacity: 0.75 }]}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="lock-open-outline" size={17} color={colors.onPrimary} />
                  <Text style={styles.ctaText}>
                    {`Unlock Premium · ${activePlan?.price}${activePlan?.period}`}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Dismiss — subtle, not a real button */}
          <TouchableOpacity onPress={onClose} style={styles.dismiss} activeOpacity={0.7}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </TouchableOpacity>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.edge,
    paddingTop: 28, paddingBottom: 40,
    alignItems: 'center',
    gap: spacing.md,
  },

  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },

  title: { fontFamily: fonts.serif,    fontSize: 22, color: colors.text,     textAlign: 'center', lineHeight: 28 },
  sub:   { fontFamily: fonts.sansBold, fontSize: 13, color: colors.primary,  textAlign: 'center', marginTop: -6 },

  benefits: { width: '100%', gap: 10 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  benefitIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(242,202,80,0.12)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  benefitText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text, flex: 1 },

  planRow: { flexDirection: 'row', width: '100%', gap: spacing.sm },
  planCard: {
    flex: 1, borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    padding: spacing.md,
    alignItems: 'center', gap: 4,
    position: 'relative',
    paddingTop: 20,
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(242,202,80,0.07)',
  },
  planBadge: {
    position: 'absolute', top: -10,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  planBadgeText:    { fontFamily: fonts.sansBold, fontSize: 9, color: colors.onPrimary, letterSpacing: 0.5 },
  planRadio:        { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  planRadioActive:  { borderColor: colors.primary },
  planRadioDot:     { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  planLabel:        { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  planLabelActive:  { color: colors.primary },
  planPrice:        { fontFamily: fonts.serif, fontSize: 20, color: colors.text },
  planPriceActive:  { color: colors.text },
  planPeriod:       { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
  planSub:          { fontFamily: fonts.sans, fontSize: 10, color: colors.textMuted, textAlign: 'center' },

  trust: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: -4 },
  trustText: { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted },

  cta:         { width: '100%' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: 16, borderRadius: borderRadius.md },
  ctaText:     { fontFamily: fonts.sansBold, fontSize: 15, color: colors.onPrimary },

  dismiss:     { paddingVertical: 6 },
  dismissText: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted + '99' },
});
