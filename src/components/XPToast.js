import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, borderRadius } from '../theme';
import { getBadge } from '../data/badges';

export default function XPToast({ props: toastProps = {} }) {
  const { xp = 0, badgeId, newTotal = 0, level = 1 } = toastProps;
  const badge = badgeId ? getBadge(badgeId) : null;
  const threshold = [0,100,250,500,900,1400,2000,2800,3800,5000,6500,8500,11000,14000,17500,21500,26000,31000,37000,44000];
  const current = threshold[level - 1] ?? 0;
  const next    = threshold[level]     ?? threshold[threshold.length - 1];
  const pct     = next > current ? Math.min(1, (newTotal - current) / (next - current)) : 1;

  return (
    <View style={styles.container}>
      <Text style={styles.lightning}>⚡</Text>
      <View style={styles.body}>
        <Text style={styles.xpText}>
          +{xp} XP{badge ? ` · Badge unlocked!` : ''}
        </Text>
        {badge && (
          <Text style={styles.badgeText}>{badge.emoji} {badge.name}</Text>
        )}
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <Text style={styles.levelText}>Level {level} · {newTotal.toLocaleString()} XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#1a237e',
    borderWidth:     1,
    borderColor:     colors.primary,
    borderRadius:    borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical:   12,
    marginHorizontal:  16,
    gap:             10,
    minWidth:        260,
  },
  lightning: { fontSize: 26 },
  body:      { flex: 1 },
  xpText:    { fontFamily: fonts.sansBold, fontSize: 13, color: colors.primary },
  badgeText: { fontFamily: fonts.sans,     fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  barBg:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, height: 5, marginTop: 6 },
  barFill:   { backgroundColor: colors.primary, borderRadius: 3, height: '100%' },
  levelText: { fontFamily: fonts.sans, fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
});
