import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectCurrency } from '../store/slices/settingsSlice';
import { formatCurrency } from '../utils/currency';
import { colors, spacing, borderRadius, fonts, shadows, rarityConfig } from '../theme';

const METAL_COLORS = {
  gold:    { bg: 'rgba(242,202,80,0.18)', text: '#f2ca50' },
  silver:  { bg: 'rgba(198,198,203,0.18)', text: '#c6c6cb' },
  copper:  { bg: 'rgba(184,115,51,0.18)', text: '#b87333' },
  bronze:  { bg: 'rgba(205,127,50,0.18)', text: '#cd7f32' },
  ancient: { bg: 'rgba(212,175,55,0.18)', text: '#d4af37' },
};

function getMetalStyle(composition = '') {
  const c = composition.toLowerCase();
  if (c.includes('gold'))   return METAL_COLORS.gold;
  if (c.includes('silver')) return METAL_COLORS.silver;
  if (c.includes('copper')) return METAL_COLORS.copper;
  if (c.includes('bronze')) return METAL_COLORS.bronze;
  return METAL_COLORS.ancient;
}

function getMetalLabel(composition = '') {
  const c = composition.toLowerCase();
  if (c.includes('gold'))   return 'GOLD';
  if (c.includes('silver')) return 'SILVER';
  if (c.includes('copper')) return 'COPPER';
  if (c.includes('bronze')) return 'BRONZE';
  return 'ANCIENT';
}

// Grid card — used in the 2-column collection grid
export function GridCoinCard({ item, onPress, onInfoPress }) {
  const { coin, condition, frontImageUri } = item;
  const currency = useSelector(selectCurrency);
  const displayImage = frontImageUri || coin.imageUrl;
  const [imgError, setImgError] = useState(false);
  const rarity = rarityConfig[coin.rarity] || rarityConfig.common;
  const metalStyle = getMetalStyle(coin.composition);
  const metalLabel = getMetalLabel(coin.composition);
  const yearDisplay = coin.year > 0 ? coin.year : `${Math.abs(coin.year)} BC`;
  const showImg = displayImage && !imgError;
  const isRare = ['rare', 'very rare', 'legendary'].includes(coin.rarity);

  return (
    <TouchableOpacity
      style={[styles.gridCard, isRare && styles.gridCardRare]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Image */}
      <View style={styles.gridImageWrap}>
        {showImg ? (
          <Image
            source={{ uri: displayImage }}
            style={styles.gridImage}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[styles.gridPlaceholder, { backgroundColor: metalStyle.bg }]}>
            <MaterialCommunityIcons name="circle-double" size={36} color={metalStyle.text} />
          </View>
        )}

        {/* Metal badge */}
        <View style={[styles.metalBadge, { backgroundColor: metalStyle.bg }]}>
          <Text style={[styles.metalBadgeText, { color: metalStyle.text }]}>{metalLabel}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.gridInfo}>
        <Text style={styles.gridName} numberOfLines={2}>{coin.name}</Text>
        <Text style={styles.gridMeta}>
          {yearDisplay}
          {condition ? ` · ${condition}` : ''}
        </Text>
        <View style={styles.gridBottom}>
          <Text style={styles.gridValue}>
            {formatCurrency(coin.estimatedValue.mid, currency)}
          </Text>
          {onInfoPress && (
            <TouchableOpacity style={styles.infoBtn} onPress={onInfoPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="information-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Legacy list card — kept for ResultsScreen alternative matches
export default function CoinCard({ item, onPress, onLongPress, showValue = true }) {
  const { coin, quantity, condition, purchasePrice, frontImageUri } = item;
  const currency = useSelector(selectCurrency);
  const displayImage = frontImageUri || coin.imageUrl;
  const [imgError, setImgError] = useState(false);
  const rarity = rarityConfig[coin.rarity] || rarityConfig.common;
  const currentValue = coin.estimatedValue.mid * (quantity || 1);
  const profit = purchasePrice ? currentValue - purchasePrice * (quantity || 1) : null;
  const metalStyle = getMetalStyle(coin.composition);
  const metalLabel = getMetalLabel(coin.composition);
  const yearDisplay = coin.year > 0 ? coin.year : `${Math.abs(coin.year)} BC`;
  const showImg = displayImage && !imgError;
  const isRare = ['rare', 'very rare', 'legendary'].includes(coin.rarity);

  return (
    <TouchableOpacity
      style={[styles.card, isRare && styles.cardRare]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.82}
    >
      <View style={styles.imageWrap}>
        {showImg ? (
          <Image source={{ uri: displayImage }} style={styles.coinImage} resizeMode="cover" onError={() => setImgError(true)} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: metalStyle.bg }]}>
            <MaterialCommunityIcons name="circle-double" size={40} color={metalStyle.text} />
          </View>
        )}
        <View style={[styles.metalBadge, { backgroundColor: metalStyle.bg }]}>
          <Text style={[styles.metalBadgeText, { color: metalStyle.text }]}>{metalLabel}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{coin.name}</Text>
        <Text style={styles.meta}>{coin.country} · {yearDisplay}</Text>
        {showValue && (
          <View style={styles.valueRow}>
            <Text style={styles.value}>{formatCurrency(currentValue, currency)}</Text>
            {profit !== null && (
              <Text style={[styles.profit, { color: profit >= 0 ? colors.success : colors.error }]}>
                {profit >= 0 ? '+' : '-'}{formatCurrency(Math.abs(profit), currency)}
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Grid card ──────────────────────────────────────────────────────────────
  gridCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    ...shadows.card,
  },
  gridCardRare: {
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  gridImageWrap: { width: '100%', aspectRatio: 1, position: 'relative' },
  gridImage:     { width: '100%', height: '100%' },
  gridPlaceholder: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  gridInfo:  { padding: spacing.sm, gap: 3 },
  gridName:  { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text, lineHeight: 18 },
  gridMeta:  { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted },
  gridBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  gridValue: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.primary },
  infoBtn:   { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },

  // ── List card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardRare: { borderTopWidth: 2, borderTopColor: colors.primary },
  imageWrap: { width: '100%', height: 140, position: 'relative' },
  coinImage: { width: '100%', height: '100%' },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  info:     { padding: spacing.md, gap: 4 },
  name:     { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.text, lineHeight: 20 },
  meta:     { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  value:    { fontFamily: fonts.sansBold, fontSize: 18, color: colors.primary },
  profit:   { fontFamily: fonts.sansMedium, fontSize: 12 },

  // ── Shared ─────────────────────────────────────────────────────────────────
  metalBadge: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  metalBadgeText: {
    fontFamily: fonts.sansBold, fontSize: 9, letterSpacing: 0.8,
  },
});
