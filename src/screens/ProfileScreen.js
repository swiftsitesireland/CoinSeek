import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectSettings } from '../store/slices/settingsSlice';
import { useStripePayment } from '../hooks/useStripePayment';
import { selectCollection, selectCollectionTotal, setCollection } from '../store/slices/collectionSlice';
import { clearHistory } from '../store/slices/historySlice';
import { signOut } from '../services/authService';
import { useAuth } from '../auth/AuthContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useScanLimit } from '../hooks/useScanLimit';
import TrialBanner from '../components/TrialBanner';
import UpgradeModal from '../components/UpgradeModal';
import { formatCurrency } from '../utils/currency';
import { openPlayStoreListing, openSupportEmail } from '../utils/links';
import { colors, spacing, borderRadius, fonts, shadows } from '../theme';
import Toast from 'react-native-toast-message';

function MenuRow({ icon, label, sub, onPress, rightElement, danger }) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, danger && styles.menuRowDanger]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <MaterialCommunityIcons name={icon} size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, danger && { color: colors.error }]}>{label}</Text>
        {sub && <Text style={styles.menuSub}>{sub}</Text>}
      </View>
      {rightElement ?? <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />}
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const insets     = useSafeAreaInsets();
  const dispatch   = useDispatch();
  const { user }   = useAuth();
  const settings   = useSelector(selectSettings);
  const collection = useSelector(selectCollection);
  const totalValue = useSelector(selectCollectionTotal);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [bannerDismissed,  setBannerDismissed]  = useState(false);

  const { trialDaysLeft, currentTier, isPremium } = useFeatureAccess('basicIdentify');
  const { scansUsed, maxScans, resetLabel }       = useScanLimit();
  const { startPayment, paymentLoading }          = useStripePayment();

  async function handleUpgradeContinue(plan) {
    const success = await startPayment(plan);
    if (success) setShowUpgradeModal(false);
  }

  function subscriptionLabel() {
    if (isPremium)        return 'Premium · Active';
    if (trialDaysLeft > 0) return `Free Trial · ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left`;
    return 'Trial Expired · Upgrade now';
  }
  // Priority: Supabase auth metadata username → local profile name → email prefix
  const name = user?.user_metadata?.username
    || (settings.userProfile?.name !== 'Collector' ? settings.userProfile?.name : null)
    || user?.email?.split('@')[0]
    || 'Collector';
  const initials = name.slice(0, 2).toUpperCase();
  const rareCount = collection.filter(i => ['rare', 'very rare', 'legendary'].includes(i.coin.rarity)).length;

  async function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          try {
            await signOut();
            dispatch(setCollection([]));
            dispatch(clearHistory());
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Sign out failed', text2: e.message });
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <UpgradeModal
        visible={showUpgradeModal}
        onContinue={handleUpgradeContinue}
        onClose={() => setShowUpgradeModal(false)}
      />

      {/* Trial banner */}
      {!isPremium && !bannerDismissed && (
        <TrialBanner
          daysLeft={trialDaysLeft}
          onUpgrade={() => setShowUpgradeModal(true)}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Profile hero ──────────────────────────────────────────── */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarInitials}>{initials}</Text>
          </LinearGradient>

          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroEmail}>{user?.email || 'No email'}</Text>

          {isPremium ? (
            <View style={styles.premiumBadge}>
              <MaterialCommunityIcons name="crown" size={13} color={colors.onPrimary} />
              <Text style={styles.premiumBadgeText}>Premium Member</Text>
            </View>
          ) : trialDaysLeft > 0 ? (
            <TouchableOpacity
              style={styles.trialBadge}
              onPress={() => setShowUpgradeModal(true)}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons name="clock-outline" size={15} color={colors.onPrimary} />
              <Text style={styles.upgradeBtnText}>Free Trial — {trialDaysLeft}d left</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => setShowUpgradeModal(true)}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons name="crown-outline" size={15} color={colors.onPrimary} />
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Stats strip ───────────────────────────────────────────── */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{collection.length}</Text>
            <Text style={styles.statLabel}>Coins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.primary }]}>
              {formatCurrency(totalValue, settings.currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.statLabel}>Value</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{rareCount}</Text>
            <Text style={styles.statLabel}>Rare+</Text>
          </View>
        </View>

        {/* ── Menu sections ─────────────────────────────────────────── */}
        <Section title="ACCOUNT">
          <MenuRow
            icon="account-edit-outline"
            label="Account Settings"
            sub="Name, email, avatar"
            onPress={() => navigation.navigate('AccountSettings')}
          />
          <MenuRow
            icon="crown-outline"
            label="Subscription"
            sub={subscriptionLabel()}
            onPress={() => navigation.navigate('Subscription')}
          />
          <MenuRow
            icon="line-scan"
            label="Today's Scans"
            sub={isPremium
              ? 'Unlimited scans'
              : `${scansUsed} of ${maxScans} used · resets in ${resetLabel}`}
            onPress={undefined}
            rightElement={
              <View style={[
                styles.scanPill,
                (scansUsed >= maxScans && !isPremium) && styles.scanPillDanger,
              ]}>
                <Text style={[
                  styles.scanPillText,
                  (scansUsed >= maxScans && !isPremium) && { color: colors.error },
                ]}>
                  {isPremium ? '∞' : `${scansUsed}/${maxScans}`}
                </Text>
              </View>
            }
          />
          <MenuRow
            icon="shield-lock-outline"
            label="Privacy & Security"
            sub="Data and security settings"
            onPress={() => navigation.navigate('PrivacySecurity')}
          />
        </Section>

        <Section title="ABOUT">
          <MenuRow
            icon="database-outline"
            label="AI Coin Identification"
            sub="Identifies coins from around the world"
            onPress={undefined}
            rightElement={null}
          />
          <MenuRow
            icon="information-outline"
            label="Version"
            sub="CoinSeek v1.0.0"
            onPress={undefined}
            rightElement={null}
          />
          <MenuRow
            icon="star-outline"
            label="Rate the App"
            onPress={() => openPlayStoreListing()}
          />
          <MenuRow
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => openSupportEmail()}
          />
          <MenuRow
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <MenuRow
            icon="file-document-outline"
            label="Terms of Service"
            onPress={() => navigation.navigate('TermsOfService')}
          />
        </Section>

        <Section title="DANGER ZONE">
          <MenuRow
            icon="logout"
            label="Sign Out"
            sub={user?.email}
            onPress={handleLogout}
            danger
            rightElement={null}
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.edge,
    gap: spacing.sm,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInitials: { fontFamily: fonts.serif, fontSize: 32, color: colors.onPrimary },
  heroName:  { fontFamily: fonts.serif, fontSize: 24, color: colors.text },
  heroEmail: { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted },

  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: 7, marginTop: spacing.xs,
  },
  premiumBadgeText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.onPrimary },

  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: 7, marginTop: spacing.xs,
  },
  trialBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.warning + 'CC', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md, paddingVertical: 7, marginTop: spacing.xs,
  },
  upgradeBtnText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.onPrimary },

  // Stats
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: spacing.edge,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statItem:   { flex: 1, alignItems: 'center', gap: 3 },
  statNum:    { fontFamily: fonts.serif, fontSize: 22, color: colors.text },
  statLabel:  { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted },
  statDivider:{ width: 1, backgroundColor: colors.outlineVariant },

  // Sections
  section:     { paddingHorizontal: spacing.edge, marginBottom: spacing.md },
  sectionTitle:{ fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.sm },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },

  // Menu row
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  menuRowDanger: { backgroundColor: 'rgba(255,180,171,0.05)' },
  menuIcon: {
    width: 38, height: 38, borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(242,202,80,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: 'rgba(255,180,171,0.12)' },
  menuText:  { flex: 1 },
  menuLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.text },
  menuSub:   { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 1 },

  // Scan pill
  scanPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(242,202,80,0.12)',
    borderRadius: borderRadius.full,
  },
  scanPillDanger: { backgroundColor: 'rgba(255,180,171,0.12)' },
  scanPillText:   { fontFamily: fonts.sansBold, fontSize: 13, color: colors.primary },
});
