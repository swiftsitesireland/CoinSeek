import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, borderRadius } from '../theme';

/**
 * Wraps children at low opacity, then lays a lock overlay on top.
 *
 * Usage:
 *   <BlurOverlay featureName="Market Value" onUpgrade={fn}>
 *     <YourPremiumCard />
 *   </BlurOverlay>
 */
export default function BlurOverlay({ featureName, onUpgrade, children, compact = false }) {
  return (
    <View style={styles.root}>
      {/* Faded content visible beneath the overlay */}
      <View style={styles.faded} pointerEvents="none">
        {children}
      </View>

      {/* Lock overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.overlay}>
          <View style={styles.lockCircle}>
            <MaterialCommunityIcons
              name="lock"
              size={compact ? 18 : 26}
              color={colors.primary}
            />
          </View>

          {!compact && (
            <>
              <Text style={styles.title}>Premium Feature</Text>
              <Text style={styles.sub}>{featureName}</Text>
            </>
          )}

          <TouchableOpacity onPress={onUpgrade} activeOpacity={0.88}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.btn, compact && styles.btnCompact]}
            >
              <MaterialCommunityIcons name="crown-outline" size={14} color={colors.onPrimary} />
              <Text style={styles.btnText}>
                {compact ? 'Upgrade' : 'Upgrade to Premium'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative' },

  faded: { opacity: 0.18 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,13,13,0.86)',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  lockCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(242,202,80,0.12)',
    borderWidth: 1, borderColor: 'rgba(242,202,80,0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },

  title: { fontFamily: fonts.serif,    fontSize: 16, color: colors.text,     textAlign: 'center' },
  sub:   { fontFamily: fonts.sans,     fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: -2 },

  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, paddingVertical: 11,
    borderRadius: borderRadius.full,
    marginTop: 4,
  },
  btnCompact: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  btnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.onPrimary },
});
