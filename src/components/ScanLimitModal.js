import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, borderRadius } from '../theme';
import { MAX_FREE_SCANS } from '../hooks/useScanLimit';

export default function ScanLimitModal({ visible, resetLabel, onUpgrade, onDismiss }) {
  function handleUpgrade() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpgrade?.();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="camera-off" size={32} color={colors.error} />
          </View>

          <Text style={styles.title}>Daily Scan Limit Reached</Text>
          <Text style={styles.sub}>
            You've used all {MAX_FREE_SCANS} free scans for today.{'\n'}
            Upgrade to Premium for unlimited scans.
          </Text>

          {/* Reset timer */}
          <View style={styles.resetPill}>
            <MaterialCommunityIcons name="clock-outline" size={15} color={colors.textMuted} />
            <Text style={styles.resetText}>
              Resets in {resetLabel || '—'}
            </Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleUpgrade}
            activeOpacity={0.88}
            style={{ width: '100%' }}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.upgradeBtn}
            >
              <MaterialCommunityIcons name="crown-outline" size={18} color={colors.onPrimary} />
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} activeOpacity={0.7}>
            <Text style={styles.dismissText}>Try again tomorrow</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
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

  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,180,171,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,180,171,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },

  title: { fontFamily: fonts.serif,    fontSize: 22, color: colors.text,     textAlign: 'center' },
  sub:   { fontFamily: fonts.sans,     fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },

  resetPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md, paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  resetText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textMuted },

  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 16, borderRadius: borderRadius.md,
    width: '100%',
  },
  upgradeBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.onPrimary },

  dismissBtn: { paddingVertical: 8 },
  dismissText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textMuted },
});
