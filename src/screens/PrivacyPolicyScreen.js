import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, borderRadius } from '../theme';

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.lastUpdated}>Last updated: May 2026</Text>

        <Text style={styles.intro}>
          CoinSeek ("we", "our", or "us") is committed to protecting your privacy.
          This policy explains what information we collect, how we use it, and your rights.
        </Text>

        <Section title="1. Information We Collect">
          {`We collect the following information when you use CoinSeek:\n\n• Email address and username when you create an account\n• Coin images you photograph for identification (processed via AI, not stored permanently)\n• Your coin collection data (stored securely in our database)\n• Subscription and payment status (we do not store card details — Stripe handles all payments)\n• Basic usage data such as scan counts and app activity`}
        </Section>

        <Section title="2. Camera & Photo Access">
          {`CoinSeek requires access to your device camera to photograph coins for identification. Images are sent to our AI service (Google Gemini) for analysis and are not permanently stored on our servers. We do not use your photos for any purpose other than coin identification.`}
        </Section>

        <Section title="3. How We Use Your Information">
          {`We use your information to:\n\n• Provide and improve the coin identification service\n• Manage your account and subscription\n• Sync your collection across devices\n• Send important account-related emails (via Resend)\n• Enforce daily scan limits for free tier users\n• Prevent fraud and abuse`}
        </Section>

        <Section title="4. Data Storage & Security">
          {`Your data is stored securely using Supabase, which provides enterprise-grade encryption at rest and in transit. We use Row Level Security (RLS) to ensure you can only access your own data. Payment processing is handled entirely by Stripe — we never see or store your card details.`}
        </Section>

        <Section title="5. Third-Party Services">
          {`CoinSeek uses the following third-party services:\n\n• Supabase — database and authentication\n• Google Gemini — AI coin identification\n• Stripe — payment processing\n• Resend — transactional emails\n\nEach service has its own privacy policy and data practices.`}
        </Section>

        <Section title="6. Data Retention">
          {`We retain your account data for as long as your account is active. If you delete your account, your personal data and collection will be permanently deleted within 30 days. Anonymised usage statistics may be retained longer.`}
        </Section>

        <Section title="7. Your Rights">
          {`You have the right to:\n\n• Access the personal data we hold about you\n• Request correction of inaccurate data\n• Request deletion of your account and data\n• Export your collection data\n• Withdraw consent at any time\n\nTo exercise any of these rights, contact us at support@coinseek.app`}
        </Section>

        <Section title="8. Children's Privacy">
          {`CoinSeek is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately.`}
        </Section>

        <Section title="9. Changes to This Policy">
          {`We may update this Privacy Policy from time to time. We will notify you of any significant changes via email or an in-app notification. Continued use of CoinSeek after changes are posted constitutes your acceptance of the updated policy.`}
        </Section>

        <Section title="10. Contact Us">
          {`If you have any questions about this Privacy Policy, please contact us at:\n\nsupport@coinseek.app`}
        </Section>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.text },

  content: { paddingHorizontal: spacing.edge, paddingTop: spacing.lg },

  lastUpdated: {
    fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted,
    marginBottom: spacing.md,
  },
  intro: {
    fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted,
    lineHeight: 22, marginBottom: spacing.lg,
  },

  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontFamily: fonts.sansBold, fontSize: 15, color: colors.primary,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted,
    lineHeight: 22,
  },
});
