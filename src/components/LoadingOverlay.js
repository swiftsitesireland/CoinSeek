import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, fonts } from '../theme';

export default function LoadingOverlay({ visible, message = 'Analyzing coin...', progress }) {
  const spin  = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(Animated.timing(spin,  { toValue: 1, duration: 1400, useNativeDriver: true })).start();
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 650, useNativeDriver: true }),
      ])).start();
    } else {
      spin.setValue(0);
      pulse.setValue(1);
    }
  }, [visible]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <MaterialCommunityIcons name="circle-slice-6" size={52} color={colors.primary} />
            </Animated.View>
          </Animated.View>

          <Text style={styles.title}>AI Recognition</Text>
          <Text style={styles.message}>{message}</Text>

          {typeof progress === 'number' && (
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
          )}

          <View style={styles.steps}>
            {['Detecting coin outline', 'Analysing surface details', 'Matching database'].map((step) => (
              <View key={step} style={styles.step}>
                <View style={styles.stepDot} />
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    gap: spacing.md,
    ...shadows.card,
  },
  title:   { fontFamily: fonts.serif, fontSize: 18, color: colors.text },
  message: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  barTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  steps: { width: '100%', gap: 8 },
  step:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  stepText: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
});
