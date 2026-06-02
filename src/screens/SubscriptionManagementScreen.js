import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { useAuth } from '../auth/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useStripePayment } from '../hooks/useStripePayment';
import {
  cancelSubscription,
  formatRenewalDate,
} from '../services/stripeService';
import { colors, spacing, borderRadius, fonts, typography } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function InfoRow({ icon, label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <MaterialCommunityIcons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value}</Text>
      </View>
    </View>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.sectionWrap}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function SubscriptionManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user }   = useAuth();
  const { subscription, isFreeTrial, isPremium, daysLeft, loading, refetch } = useSubscription();
  const { startPayment, paymentLoading } = useStripePayment();
  const [canceling, setCanceling] = useState(false);

  // ─── Status label ─────────────────────────────────────────────────────────
  function getStatusLabel() {
    if (!subscription || subscription.status === 'canceled') return { label: 'Inactive',    color: colors.error };
    if (isFreeTrial)   return { label: `Free Trial — ${daysLeft}d left`, color: colors.warning };
    if (isPremium)     return { label: 'Premium Active',                  color: colors.success };
    return               { label: 'Expired',                              color: colors.error };
  }

  const statusInfo = getStatusLabel();

  // ─── Upgrade to premium ───────────────────────────────────────────────────
  async function handleUpgrade(plan) {
    const success = await startPayment(plan);
    if (success) {
      await refetch();
      Toast.show({ type: 'success', text1: 'Upgraded to Premium!', text2: 'All features are now unlocked ✨' });
    }
  }

  // ─── Cancel ───────────────────────────────────────────────────────────────
  function handleCancel() {
    const endDate = formatRenewalDate(subscription);
    Alert.alert(
      'Cancel Subscription',
      `Your access will continue until ${endDate}.\n\nAre you sure you want to cancel?`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setCanceling(true);
            try {
              const result = await cancelSubscription();
              await refetch();
              const until = result?.access_until
                ? new Date(result.access_until).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })
                : endDate;
              Toast.show({ type: 'success', text1: 'Subscription cancelled', text2: `Access continues until ${until}` });
            } catch (e) {
              Toast.show({ type: 'error', text1: 'Could not cancel', text2: e.message });
            } finally {
              setCanceling(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header bar ─────────────────────────────────────────────── */}
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* ── Plan hero ───────────────────────────────────────────────── */}
        <LinearGradient
          colors={isPremium ? [colors.gradientStart, colors.gradientEnd] : ['#1e1e1e', '#2a2a2a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.planHero}
        >
          <View style={styles.planHeroIcon}>
            <MaterialCommunityIcons
              name={isPremium ? 'crown' : 'clock-outline'}
              size={32}
              color={isPremium ? colors.onPrimary : colors.primary}
            />
          </View>
          <Text style={[styles.planHeroName, isPremium && styles.planHeroNameDark]}>
            {isPremium ? 'Premium' : isFreeTrial ? 'Free Trial' : 'No Active Plan'}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: statusInfo.color + '33', borderColor: statusInfo.color + '66' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusPillText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </LinearGradient>

        {/* ── Plan details ────────────────────────────────────────────── */}
        {subscription && (
          <SectionCard title="Plan Details">
            <InfoRow
              icon="tag-outline"
              label="Current plan"
              value={isPremium ? 'Premium · €18.99/year' : 'Free Trial'}
            />
            <InfoRow
              icon="check-circle-outline"
              label="Status"
              value={subscription.status === 'active' ? 'Active' : 'Cancelled'}
              valueColor={subscription.status === 'active' ? colors.success : colors.error}
            />
            {isFreeTrial && (
              <InfoRow
                icon="clock-outline"
                label="Trial ends"
                value={`${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                valueColor={daysLeft <= 2 ? colors.warning : undefined}
              />
            )}
            {isPremium && subscription.current_period_end && (
              <InfoRow
                icon="calendar-refresh-outline"
                label="Renews on"
                value={formatRenewalDate(subscription)}
              />
            )}
            {subscription.created_at && (
              <InfoRow
                icon="calendar-plus-outline"
                label="Member since"
                value={new Date(subscription.created_at).toLocaleDateString('en-IE', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              />
            )}
          </SectionCard>
        )}

        {/* ── Upgrade (shown when not premium) ────────────────────────── */}
        {!isPremium && (
          <SectionCard title="Upgrade">
            <View style={styles.upgradeBox}>
              <MaterialCommunityIcons name="crown" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeTitle}>Go Premium</Text>
                <Text style={styles.upgradeSub}>€18.99 / year · just €1.58/month</Text>
              </View>
              <TouchableOpacity
                style={[styles.upgradeBtn, paymentLoading && { opacity: 0.6 }]}
                onPress={() => handleUpgrade('yearly')}
                disabled={paymentLoading}
                activeOpacity={0.85}
              >
                {paymentLoading
                  ? <ActivityIndicator size="small" color={colors.onPrimary} />
                  : <Text style={styles.upgradeBtnText}>Upgrade</Text>
                }
              </TouchableOpacity>
            </View>
          </SectionCard>
        )}

        {/* ── Manage ──────────────────────────────────────────────────── */}
        {isPremium && subscription && subscription.status === 'active' && (
          <SectionCard title="Manage">
            <TouchableOpacity
              style={[styles.dangerRow, canceling && { opacity: 0.6 }]}
              onPress={handleCancel}
              disabled={canceling}
              activeOpacity={0.75}
            >
              <View style={styles.dangerIconWrap}>
                {canceling
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <MaterialCommunityIcons name="cancel" size={18} color={colors.error} />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dangerLabel}>Cancel Subscription</Text>
                <Text style={styles.dangerSub}>Access continues until {formatRenewalDate(subscription)}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.error} />
            </TouchableOpacity>
          </SectionCard>
        )}

        {/* ── No subscription ─────────────────────────────────────────── */}
        {!subscription && !isFreeTrial && (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="credit-card-off-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No active plan</Text>
            <Text style={styles.emptySub}>Upgrade to Premium to unlock unlimited scans and all features.</Text>
            <TouchableOpacity
              style={[styles.startBtn, paymentLoading && { opacity: 0.6 }]}
              onPress={() => handleUpgrade('yearly')}
              disabled={paymentLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startBtnGradient}
              >
                {paymentLoading
                  ? <ActivityIndicator size="small" color={colors.onPrimary} />
                  : <Text style={styles.startBtnText}>Upgrade to Premium</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.supportText}>
          Questions? Contact support@coinseek.app
        </Text>
        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },

  // Header bar
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
  },
  backBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.text },

  // Hero
  planHero: {
    margin: spacing.edge, borderRadius: borderRadius.xl,
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
  },
  planHeroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.20)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  planHeroName:     { fontFamily: fonts.serif, fontSize: 28, color: colors.text },
  planHeroNameDark: { color: colors.onPrimary },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: borderRadius.full, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  statusDot:      { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontFamily: fonts.sansBold, fontSize: 12 },

  // Section cards
  sectionWrap:  { paddingHorizontal: spacing.edge, marginTop: spacing.md },
  sectionTitle: {
    fontFamily: fonts.sansBold, fontSize: 11,
    color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: spacing.sm, paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden',
  },

  // Info rows
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  infoText:  { flex: 1 },
  infoLabel: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
  infoValue: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text, marginTop: 2 },

  // Upgrade box
  upgradeBox: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
  },
  upgradeTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.text },
  upgradeSub:   { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
  upgradeBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 9, minWidth: 90, alignItems: 'center',
  },
  upgradeBtnText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.onPrimary },

  // Danger row
  dangerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md,
    backgroundColor: colors.error + '0D',
  },
  dangerIconWrap: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    backgroundColor: colors.error + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  dangerLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.error },
  dangerSub:   { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 1 },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, gap: spacing.md },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, textAlign: 'center' },
  emptySub:   { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  startBtn:         { borderRadius: borderRadius.md, overflow: 'hidden', width: '100%', marginTop: spacing.sm },
  startBtnGradient: { paddingVertical: 15, alignItems: 'center' },
  startBtnText:     { fontFamily: fonts.sansBold, fontSize: 15, color: colors.onPrimary },

  // Support
  supportText: {
    fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted,
    textAlign: 'center', marginTop: spacing.lg,
  },
});
