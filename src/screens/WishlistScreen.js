import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectWishlist, removeFromWishlist } from '../store/slices/collectionSlice';
import { useSelector as useReduxSelector } from 'react-redux';
import { selectSettings } from '../store/slices/settingsSlice';
import { formatCurrency } from '../utils/currency';
import { colors, spacing, borderRadius, fonts } from '../theme';
import Toast from 'react-native-toast-message';

function WishlistItem({ item, onRemove }) {
  const settings = useReduxSelector(selectSettings);
  const { coin } = item;

  return (
    <View style={styles.card}>
      {/* Coin icon */}
      <View style={styles.coinIcon}>
        <MaterialCommunityIcons name="circle-outline" size={28} color={colors.primary} />
      </View>

      {/* Details */}
      <View style={styles.cardText}>
        <Text style={styles.coinName} numberOfLines={1}>{coin.name}</Text>
        <Text style={styles.coinMeta}>
          {[coin.country, coin.year > 0 ? coin.year : null].filter(Boolean).join(' · ')}
        </Text>
        {coin.estimatedValue?.mid > 0 && (
          <Text style={styles.coinValue}>
            ~{formatCurrency(coin.estimatedValue.mid, settings.currency)}
          </Text>
        )}
      </View>

      {/* Rarity chip */}
      <View style={[styles.rarityChip, rarityStyle(coin.rarity)]}>
        <Text style={styles.rarityText}>{coin.rarity || 'common'}</Text>
      </View>

      {/* Remove */}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(item.id, coin.name)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <MaterialCommunityIcons name="close" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

function rarityStyle(rarity) {
  const map = {
    legendary: { backgroundColor: 'rgba(229,200,122,0.15)', borderColor: 'rgba(229,200,122,0.4)' },
    'very rare': { backgroundColor: 'rgba(212,175,55,0.15)',  borderColor: 'rgba(212,175,55,0.4)'  },
    rare:       { backgroundColor: 'rgba(242,202,80,0.12)',  borderColor: 'rgba(242,202,80,0.35)' },
    uncommon:   { backgroundColor: 'rgba(144,180,206,0.12)', borderColor: 'rgba(144,180,206,0.35)' },
  };
  return map[rarity] ?? { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' };
}

export default function WishlistScreen({ navigation }) {
  const insets   = useSafeAreaInsets();
  const dispatch = useDispatch();
  const wishlist = useSelector(selectWishlist);

  function handleRemove(id, name) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Remove from Wishlist',
      `Remove "${name}" from your wishlist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            dispatch(removeFromWishlist(id));
            Toast.show({ type: 'success', text1: 'Removed from wishlist' });
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Wishlist</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{wishlist.length}</Text>
        </View>
      </View>

      {wishlist.length === 0 ? (
        /* Empty state */
        <View style={styles.empty}>
          <MaterialCommunityIcons name="heart-outline" size={56} color={colors.outlineVariant} />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySub}>
            Tap the heart icon on any scan result to save coins you'd like to find.
          </Text>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => navigation.navigate('Scan')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="line-scan" size={16} color={colors.onPrimary} />
            <Text style={styles.scanBtnText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WishlistItem item={item} onRemove={handleRemove} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              {wishlist.length} coin{wishlist.length !== 1 ? 's' : ''} on your wishlist
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

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
  countPill: {
    minWidth: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(242,202,80,0.15)',
    borderWidth: 1, borderColor: 'rgba(242,202,80,0.3)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  countText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.primary },

  // List
  list:       { padding: spacing.edge, gap: spacing.sm, paddingBottom: 48 },
  listHeader: {
    fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted,
    letterSpacing: 0.8, marginBottom: spacing.sm,
  },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    padding: spacing.md,
  },
  coinIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(242,202,80,0.1)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardText:  { flex: 1 },
  coinName:  { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },
  coinMeta:  { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  coinValue: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.primary, marginTop: 3 },

  rarityChip: {
    borderRadius: borderRadius.full, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0,
  },
  rarityText: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.textVariant, textTransform: 'uppercase', letterSpacing: 0.5 },

  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  // Empty state
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, textAlign: 'center' },
  emptySub:   { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg, paddingVertical: 12, marginTop: spacing.sm,
  },
  scanBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.onPrimary },
});
