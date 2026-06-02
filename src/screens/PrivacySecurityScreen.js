import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { selectPrivacy, setPrivacySetting } from '../store/slices/settingsSlice';
import { clearHistory } from '../store/slices/historySlice';
import { saveHistory } from '../services/storage';
import { supabase } from '../config/supabase';
import { colors, spacing, borderRadius, fonts, typography } from '../theme';
import Toast from 'react-native-toast-message';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, description, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {description && <Text style={styles.sectionDesc}>{description}</Text>}
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function ToggleRow({ icon, label, sub, value, onValueChange, last }) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onValueChange(v);
        }}
        trackColor={{ false: colors.outlineVariant, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

function LinkRow({ icon, label, sub, onPress, last, danger }) {
  return (
    <TouchableOpacity
      style={[styles.row, last && styles.rowLast, danger && styles.rowDanger]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      activeOpacity={0.75}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={danger ? colors.error : colors.primary}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: colors.error }]}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={18}
        color={danger ? colors.error : colors.textMuted}
      />
    </TouchableOpacity>
  );
}

function InfoBanner({ icon, text }) {
  return (
    <View style={styles.infoBanner}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.primary} />
      <Text style={styles.infoBannerText}>{text}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PrivacySecurityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  // Privacy/security preferences are stored in the settings slice and persisted
  // to AsyncStorage, so toggles survive an app restart (GDPR requirement).
  const privacy = useSelector(selectPrivacy);
  const [downloading, setDownloading] = useState(false);

  function setPref(key, value) {
    dispatch(setPrivacySetting({ key, value }));
  }

  async function handleDownloadData() {
    Alert.alert(
      'Request Your Data',
      'We\'ll email a copy of all your CoinSeek data (scans, collection, account info) to your registered email address within 30 days, as required by GDPR.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send My Data',
          onPress: async () => {
            if (downloading) return;
            setDownloading(true);
            try {
              const { error } = await supabase.functions.invoke('export-data', { body: {} });
              if (error) throw error;
              Toast.show({
                type: 'success',
                text1: 'Request received',
                text2: 'You\'ll receive your data export within 30 days.',
              });
            } catch (e) {
              Toast.show({
                type: 'error',
                text1: 'Request failed',
                text2: 'Please try again or email support@coinseek.app',
              });
            } finally {
              setDownloading(false);
            }
          },
        },
      ],
    );
  }

  function handleClearScanHistory() {
    Alert.alert(
      'Clear Scan History',
      'This will permanently remove all your past scan results. Your saved collection is not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: async () => {
            dispatch(clearHistory());
            await saveHistory([]);
            Toast.show({
              type: 'success',
              text1: 'Scan history cleared',
            });
          },
        },
      ],
    );
  }

  function handleRevokeConsent() {
    Alert.alert(
      'Revoke Data Consent',
      'Revoking consent will disable all analytics and personalisation. Some features may work differently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            setPref('analytics', false);
            setPref('personalisedTips', false);
            Toast.show({ type: 'success', text1: 'Consent revoked', text2: 'Analytics and personalisation disabled.' });
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Security</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Trust banner ────────────────────────────────────────────────── */}
        <InfoBanner
          icon="shield-check-outline"
          text="Your data is encrypted at rest and in transit. We never sell personal information to third parties."
        />

        {/* ── Privacy ─────────────────────────────────────────────────────── */}
        <Section
          title="PRIVACY"
          description="Control how CoinSeek uses your data to improve your experience."
        >
          <ToggleRow
            icon="chart-bar"
            label="Usage Analytics"
            sub="Help us improve by sharing anonymous usage data"
            value={privacy.analytics}
            onValueChange={(v) => setPref('analytics', v)}
          />
          <ToggleRow
            icon="bug-outline"
            label="Crash Reports"
            sub="Automatically send crash reports to fix bugs faster"
            value={privacy.crashReports}
            onValueChange={(v) => setPref('crashReports', v)}
          />
          <ToggleRow
            icon="lightbulb-outline"
            label="Personalised Tips"
            sub="Coin insights tailored to your collection"
            value={privacy.personalisedTips}
            onValueChange={(v) => setPref('personalisedTips', v)}
          />
          <ToggleRow
            icon="history"
            label="Save Scan History"
            sub="Store a log of all your coin scans"
            value={privacy.scanHistory}
            onValueChange={(v) => setPref('scanHistory', v)}
            last
          />
        </Section>

        {/* ── Security ────────────────────────────────────────────────────── */}
        <Section
          title="SECURITY"
          description="Protect your account and collection."
        >
          <ToggleRow
            icon="bell-alert-outline"
            label="Login Alerts"
            sub="Coming soon — sign-in notifications are not yet active"
            value={privacy.loginAlerts}
            onValueChange={(v) => setPref('loginAlerts', v)}
          />
          <LinkRow
            icon="lock-reset"
            label="Change Password"
            sub="Update your account password"
            onPress={() => navigation.navigate('ForgotPassword')}
            last
          />
        </Section>

        {/* ── Your Data (GDPR) ────────────────────────────────────────────── */}
        <Section
          title="YOUR DATA"
          description="Rights under GDPR and applicable privacy law."
        >
          <LinkRow
            icon="download-outline"
            label="Download My Data"
            sub="Receive a copy of everything we store about you"
            onPress={handleDownloadData}
          />
          <LinkRow
            icon="delete-clock-outline"
            label="Clear Scan History"
            sub="Remove all past scan results permanently"
            onPress={handleClearScanHistory}
          />
          <LinkRow
            icon="hand-back-left-off-outline"
            label="Revoke Data Consent"
            sub="Disable all analytics and personalisation"
            onPress={handleRevokeConsent}
            last
            danger
          />
        </Section>

        {/* ── Legal ───────────────────────────────────────────────────────── */}
        <Section title="LEGAL">
          <LinkRow
            icon="file-document-outline"
            label="Privacy Policy"
            sub="How we collect, use, and protect your data"
            onPress={() => navigation.navigate('PrivacyPolicy')}
          />
          <LinkRow
            icon="scale-balance"
            label="Terms of Service"
            sub="The rules governing your use of CoinSeek"
            onPress={() => navigation.navigate('TermsOfService')}
          />
          <LinkRow
            icon="email-outline"
            label="Contact Support"
            sub="Questions about your privacy? We're here."
            onPress={() => Linking.openURL('mailto:support@coinseek.app')}
            last
          />
        </Section>

        {/* ── Version note ────────────────────────────────────────────────── */}
        <Text style={styles.versionNote}>Privacy policy last updated: May 2026</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xl },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.edge, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.serif, fontSize: 20, color: colors.primary },

  // Trust banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    marginHorizontal: spacing.edge, marginTop: spacing.lg,
    backgroundColor: 'rgba(242,202,80,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: 'rgba(242,202,80,0.2)',
    padding: spacing.md,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textVariant,
    lineHeight: 20,
  },

  // Section
  section:      { paddingHorizontal: spacing.edge, marginTop: spacing.lg },
  sectionHeader:{ marginBottom: spacing.sm, gap: 2 },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.8 },
  sectionDesc:  { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 2 },
  sectionCard:  {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  rowLast:      { borderBottomWidth: 0 },
  rowDanger:    { backgroundColor: 'rgba(255,180,171,0.05)' },
  rowIcon: {
    width: 38, height: 38, borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(242,202,80,0.12)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconDanger:{ backgroundColor: 'rgba(255,180,171,0.12)' },
  rowText:  { flex: 1 },
  rowLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.text },
  rowSub:   { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 1, lineHeight: 17 },

  // Footer note
  versionNote: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
