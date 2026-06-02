import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing } from '../theme';

/**
 * Dismissible trial banner shown at the top of screens.
 * Turns orange when ≤ 2 days remain.
 */
export default function TrialBanner({ daysLeft, onUpgrade, onDismiss }) {
  if (daysLeft <= 0) return null;

  const urgent = daysLeft <= 2;

  function handleUpgrade() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpgrade?.();
  }

  return (
    <View style={[styles.banner, urgent && styles.bannerUrgent]}>
      <MaterialCommunityIcons
        name="clock-alert-outline"
        size={15}
        color={urgent ? '#ff9500' : colors.textMuted}
        style={{ flexShrink: 0 }}
      />
      <Text style={[styles.text, urgent && styles.textUrgent]} numberOfLines={1}>
        Free Trial: <Text style={styles.bold}>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</Text> left ·{' '}
      </Text>
      <TouchableOpacity onPress={handleUpgrade} activeOpacity={0.8}>
        <Text style={styles.link}>Upgrade now</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onDismiss} style={styles.close} activeOpacity={0.7}>
        <MaterialCommunityIcons name="close" size={15} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.edge, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    gap: 4,
  },
  bannerUrgent: {
    backgroundColor: 'rgba(255,149,0,0.10)',
    borderBottomColor: 'rgba(255,149,0,0.30)',
  },

  text:        { fontFamily: fonts.sans,     fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  textUrgent:  { color: '#ff9500' },
  bold:        { fontFamily: fonts.sansBold },
  link:        { fontFamily: fonts.sansBold, fontSize: 13, color: colors.primary },

  close: { marginLeft: 'auto', padding: 4, flexShrink: 0 },
});
