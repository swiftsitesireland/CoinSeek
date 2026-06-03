import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, borderRadius, fonts, spacing } from '../theme';

const MENU_WIDTH = 180;
const { width: SCREEN_W } = Dimensions.get('window');

/**
 * Reusable meatball-menu popover (Modal-based).
 *
 * Use this outside of other Modals (e.g. CollectionScreen).
 * For inside a Modal (e.g. CoinDetailsModal), use the inline overlay
 * pattern instead — React Native does not support nested Modals on iOS.
 *
 * Props:
 *   visible   bool
 *   onClose   () => void          — called on backdrop tap
 *   anchor    { x: number, y: number } — screen coords from ref.measure
 *   items     Array<{ label, icon, color?, onPress }>
 */
export default function PopoverMenu({ visible, onClose, anchor, items = [] }) {
  if (!visible) return null;

  const anchorX = anchor?.x ?? 0;
  const anchorY = anchor?.y ?? 0;

  // Right-align the card if it would overflow the screen's right edge
  const menuLeft = anchorX + MENU_WIDTH > SCREEN_W
    ? anchorX - MENU_WIDTH
    : anchorX;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Full-screen transparent backdrop — tap outside to dismiss */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        activeOpacity={1}
      />

      {/* Menu card — positioned below and aligned to the anchor point */}
      <View style={[styles.card, { top: anchorY + 6, left: menuLeft }]}>
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={styles.row}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={16}
                color={item.color ?? colors.text}
              />
              <Text style={[styles.label, { color: item.color ?? colors.text }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    minWidth: MENU_WIDTH,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    // Shadow
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
  },
});
