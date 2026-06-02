import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGamification } from '../hooks/useGamification';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { getBadgesByCategory } from '../data/badges';
import { getDailyChallenges, getWeeklyChallenges } from '../data/challenges';
import { LEVEL_TITLES } from '../store/slices/gamificationSlice';
import UpgradeModal from '../components/UpgradeModal';
import { useStripePayment } from '../hooks/useStripePayment';
import { colors, spacing, borderRadius, fonts } from '../theme';

const LEVEL_THRESHOLDS = [0,100,250,500,900,1400,2000,2800,3800,5000,6500,8500,11000,14000,17500,21500,26000,31000,37000,44000];

function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

function msUntilNextMonday() {
  const now = new Date();
  const day = now.getDay();
  const daysUntil = day === 0 ? 1 : (8 - day);
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  return next - now;
}

function formatTimeLeft(ms) {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor(ms / 3_600_000);
  if (d > 0) return `${d}d left`;
  return `${h}h left`;
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { xp, weekXp, level, levelTitle, xpToNextLevel, badges, challenges, leaderboard, loading, refetch } = useGamification();
  const access = useFeatureAccess('basicIdentify');
  const { startPayment, paymentLoading } = useStripePayment();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const threshold  = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThresh = LEVEL_THRESHOLDS[level]     ?? threshold;
  const pct        = nextThresh > threshold ? Math.min(1, (xp - threshold) / (nextThresh - threshold)) : 1;

  const dailyChallenges  = getDailyChallenges();
  const weeklyChallenges = getWeeklyChallenges();

  function challengeProgress(id) {
    return challenges.find((c) => c.challengeId === id) ?? { progress: 0, completed: false };
  }

  function renderChallenge(template, resetMs) {
    const { progress, completed } = challengeProgress(template.id);
    const pctDone = Math.min(1, progress / template.targetCount);
    return (
      <View key={template.id} style={styles.challengeCard}>
        <View style={styles.challengeRow}>
          <View style={styles.challengeIcon}>
            <MaterialCommunityIcons name="target" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitle}>{template.title}</Text>
            <Text style={styles.challengeDesc}>{template.description}</Text>
          </View>
          <Text style={styles.challengeXP}>+{template.xpReward} XP</Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {
              width: `${Math.round(pctDone * 100)}%`,
              backgroundColor: completed ? colors.success : colors.primary,
            }]} />
          </View>
          {completed
            ? <Text style={styles.completedText}>✓ Done</Text>
            : <Text style={styles.progressCount}>{progress} / {template.targetCount}</Text>}
        </View>
        <Text style={styles.resetText}>{formatTimeLeft(resetMs)}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const dailyResetMs  = msUntilMidnight();
  const weeklyResetMs = msUntilNextMonday();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <UpgradeModal
        visible={showUpgrade}
        featureName="Gamification"
        loading={paymentLoading}
        onContinue={async (plan) => { await startPayment(plan); setShowUpgrade(false); }}
        onClose={() => setShowUpgrade(false)}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Progress</Text>
        <TouchableOpacity onPress={refetch}>
          <MaterialCommunityIcons name="refresh" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Level card */}
        <View style={{ paddingHorizontal: spacing.edge, marginTop: spacing.md }}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.levelCard}
          >
            <View style={styles.levelCardTop}>
              <View>
                <Text style={styles.levelLabel}>LEVEL {level}</Text>
                <Text style={styles.levelTitleText}>{levelTitle}</Text>
              </View>
              <View style={styles.levelIconBg}>
                <Text style={{ fontSize: 26 }}>🪙</Text>
              </View>
            </View>
            <View style={styles.xpBarRow}>
              <Text style={styles.xpBarLabel}>{xp.toLocaleString()} XP</Text>
              <Text style={styles.xpBarLabel}>{xpToNextLevel.toLocaleString()} to Level {level + 1}</Text>
            </View>
            <View style={styles.xpBarBg}>
              <View style={[styles.xpBarFill, { width: `${Math.round(pct * 100)}%` }]} />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{badges.length}</Text>
                <Text style={styles.statLabel}>Badges</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{weekXp.toLocaleString()}</Text>
                <Text style={styles.statLabel}>This week</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {leaderboard.length > 0 ? `#${leaderboard[0].rank}` : '—'}
                </Text>
                <Text style={styles.statLabel}>Rank</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Daily challenges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAILY CHALLENGES</Text>
          {dailyChallenges.map((t) => renderChallenge(t, dailyResetMs))}
        </View>

        {/* Weekly challenges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEEKLY CHALLENGES</Text>
          {weeklyChallenges.map((t) => renderChallenge(t, weeklyResetMs))}
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BADGES · {badges.length} / 30</Text>
          <View style={styles.badgeGrid}>
            {['scanning','collection','geography','era','rarity','challenges','levels','special'].flatMap((cat) =>
              getBadgesByCategory(cat).map((b) => {
                const earned = badges.includes(b.id);
                return (
                  <View key={b.id} style={[styles.badgeCell, !earned && styles.badgeCellLocked]}>
                    <Text style={[styles.badgeEmoji, !earned && { opacity: 0.25 }]}>{b.emoji}</Text>
                    <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={1}>
                      {b.name}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THIS WEEK'S TOP COLLECTORS</Text>
          <View style={styles.leaderboardCard}>
            {leaderboard.length === 0 ? (
              <Text style={styles.emptyText}>No data yet — scan some coins!</Text>
            ) : (
              leaderboard.map((row) => (
                <View key={row.user_id} style={styles.leaderRow}>
                  <Text style={[styles.leaderRank, row.rank <= 3 && { color: colors.primary }]}>
                    {row.rank}
                  </Text>
                  <Text style={styles.leaderName}>{row.display_name}</Text>
                  <Text style={styles.leaderXP}>{row.week_xp.toLocaleString()} XP</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  header:  {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.edge, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.primary },

  levelCard:    { borderRadius: borderRadius.xl, padding: spacing.lg },
  levelCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  levelLabel:   { fontFamily: fonts.sansBold, fontSize: 10, color: 'rgba(0,0,0,0.5)', letterSpacing: 1 },
  levelTitleText: { fontFamily: fonts.serif, fontSize: 22, color: colors.onPrimary },
  levelIconBg:  { backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  xpBarRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  xpBarLabel:   { fontFamily: fonts.sans, fontSize: 10, color: 'rgba(0,0,0,0.5)' },
  xpBarBg:      { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 4, height: 8, marginBottom: spacing.md },
  xpBarFill:    { backgroundColor: colors.onPrimary, borderRadius: 4, height: '100%' },
  statsRow:     { flexDirection: 'row', justifyContent: 'space-around', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
  statCell:     { alignItems: 'center' },
  statValue:    { fontFamily: fonts.sansBold, fontSize: 16, color: colors.onPrimary },
  statLabel:    { fontFamily: fonts.sans, fontSize: 10, color: 'rgba(0,0,0,0.5)', marginTop: 2 },
  statDivider:  { width: 1, backgroundColor: 'rgba(0,0,0,0.1)' },

  section:      { paddingHorizontal: spacing.edge, marginTop: spacing.xl },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.sm },

  challengeCard:  { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.md, marginBottom: 8 },
  challengeRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  challengeIcon:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(242,202,80,0.12)', alignItems: 'center', justifyContent: 'center' },
  challengeTitle: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text },
  challengeDesc:  { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, marginTop: 1 },
  challengeXP:    { fontFamily: fonts.sansBold, fontSize: 11, color: colors.primary },
  progressRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressBg:     { flex: 1, backgroundColor: colors.outlineVariant, borderRadius: 3, height: 5 },
  progressFill:   { borderRadius: 3, height: '100%' },
  progressCount:  { fontFamily: fonts.sans, fontSize: 10, color: colors.textMuted, width: 36, textAlign: 'right' },
  completedText:  { fontFamily: fonts.sansBold, fontSize: 10, color: colors.success, width: 36, textAlign: 'right' },
  resetText:      { fontFamily: fonts.sans, fontSize: 9, color: colors.textMuted, marginTop: 4 },

  badgeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCell:      { width: 66, backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary, padding: 8, alignItems: 'center' },
  badgeCellLocked:{ borderColor: colors.outlineVariant },
  badgeEmoji:     { fontSize: 22 },
  badgeName:      { fontFamily: fonts.sans, fontSize: 8, color: colors.primary, marginTop: 3, textAlign: 'center' },
  badgeNameLocked:{ color: colors.textMuted },

  leaderboardCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden' },
  leaderRow:       { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, gap: spacing.md },
  leaderRank:      { fontFamily: fonts.sansBold, fontSize: 14, color: colors.textMuted, width: 24 },
  leaderName:      { flex: 1, fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text },
  leaderXP:        { fontFamily: fonts.sansBold, fontSize: 12, color: colors.textMuted },
  emptyText:       { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
});
