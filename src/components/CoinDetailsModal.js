import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrency } from '../store/slices/settingsSlice';
import { selectIsFavourite, toggleFavourite } from '../store/slices/collectionSlice';
import { formatCurrency } from '../utils/currency';
import { colors, spacing, borderRadius, fonts, rarityConfig } from '../theme';

const DetailRow = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLabelWrap}>
      {icon && <MaterialCommunityIcons name={icon} size={14} color={colors.primary} />}
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

export default function CoinDetailsModal({
  visible, coin, onClose,
  onAddToCollection,
  isInCollection,
  collectionItem,
  onRemove,
}) {
  const [activeTab, setActiveTab] = useState('details');
  const [imgError, setImgError] = useState(false);
  // Controls the inline meatball-menu overlay (not a nested Modal — iOS doesn't
  // support Modals nested inside Modals, so we use an absolute-positioned View)
  const [menuVisible, setMenuVisible] = useState(false);
  const currency = useSelector(selectCurrency);
  const dispatch = useDispatch();
  const isFavourite = useSelector(selectIsFavourite(coin?.id));
  useEffect(() => { setImgError(false); }, [coin?.id]);
  // Reset menu whenever the sheet closes so it doesn't flash open on re-open
  useEffect(() => { if (!visible) setMenuVisible(false); }, [visible]);
  if (!coin) return null;

  const displayImage = collectionItem?.frontImageUri || coin.imageUrl;
  const showImg = displayImage && !imgError;
  const rarity = rarityConfig[coin.rarity] || rarityConfig.common;
  const yearDisplay = coin.year > 0 ? coin.year : `${Math.abs(coin.year)} BC`;

  const tabs = [
    { id: 'details', label: 'Details', icon: 'information-outline' },
    { id: 'specs',   label: 'Specs',   icon: 'ruler'               },
    { id: 'value',   label: 'Value',   icon: 'currency-usd'        },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>

        {/* ── Hero image ──────────────────────────────────────────── */}
        <View style={styles.hero}>
          {showImg ? (
            <Image
              source={{ uri: displayImage }}
              style={styles.heroImg}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[styles.heroPlaceholder, { backgroundColor: rarity.color + '18' }]}>
              <MaterialCommunityIcons name="circle-double" size={80} color={rarity.color} />
            </View>
          )}

          {/* Fade into the meta block for legibility */}
          <LinearGradient
            colors={['transparent', 'transparent', colors.surfaceContainerLow]}
            style={styles.heroFade}
            pointerEvents="none"
          />

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
          >
            <MaterialCommunityIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          {/* ⋮ meatball menu — only shown when viewing a collection item */}
          {isInCollection && onRemove && (
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuVisible(true); }}
            >
              <MaterialCommunityIcons name="dots-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); dispatch(toggleFavourite(coin.id)); }}
          >
            <MaterialCommunityIcons
              name={isFavourite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavourite ? colors.error : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={[styles.rarityBadge, { backgroundColor: rarity.color + '22', borderColor: rarity.color + '55' }]}>
            <Text style={[styles.rarityBadgeText, { color: rarity.color }]}>{rarity.label}</Text>
          </View>

          <Text style={styles.coinName}>{coin.name}</Text>
          <Text style={styles.coinMeta}>{coin.country} · {yearDisplay}</Text>

          <View style={styles.valueStrip}>
            <View style={styles.valueCell}>
              <Text style={styles.valueCellLabel}>Low</Text>
              <Text style={styles.valueCellNum}>{formatCurrency(coin.estimatedValue.low, currency)}</Text>
            </View>
            <View style={[styles.valueCell, styles.valueCellMid]}>
              <Text style={[styles.valueCellLabel, { color: colors.primary }]}>Est. Value</Text>
              <Text style={[styles.valueCellNum, { color: colors.primary, fontSize: 22, fontFamily: fonts.serif }]}>
                {formatCurrency(coin.estimatedValue.mid, currency)}
              </Text>
            </View>
            <View style={styles.valueCell}>
              <Text style={styles.valueCellLabel}>High</Text>
              <Text style={styles.valueCellNum}>{formatCurrency(coin.estimatedValue.high, currency)}</Text>
            </View>
          </View>
        </View>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <View style={styles.tabs}>
          {tabs.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, activeTab === t.id && styles.tabActive]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(t.id); }}
            >
              <MaterialCommunityIcons name={t.icon} size={15} color={activeTab === t.id ? colors.primary : colors.textMuted} />
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Content ─────────────────────────────────────────────── */}
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {activeTab === 'details' && (
            <View style={styles.tabBody}>
              <Text style={styles.sectionLabel}>About</Text>
              <Text style={styles.description}>{coin.description}</Text>

              <Text style={styles.sectionLabel}>Design</Text>
              <View style={styles.designRow}>
                <View style={styles.designSide}>
                  <Text style={styles.designTitle}>OBVERSE</Text>
                  <Text style={styles.designText}>{coin.obverse}</Text>
                </View>
                <View style={styles.designDivider} />
                <View style={styles.designSide}>
                  <Text style={styles.designTitle}>REVERSE</Text>
                  <Text style={styles.designText}>{coin.reverse}</Text>
                </View>
              </View>

              <Text style={styles.sectionLabel}>Identification</Text>
              <DetailRow label="Series"    value={coin.series}             icon="bookmark-outline" />
              <DetailRow label="Designer"  value={coin.designer}           icon="pen"              />
              <DetailRow label="Mint"      value={coin.mint}               icon="factory"          />
              <DetailRow label="Mint Mark" value={coin.mintMark || 'None'} icon="alphabetical"     />

              {coin.tags?.length > 0 && (
                <View style={styles.tags}>
                  {coin.tags.map(tag => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === 'specs' && (
            <View style={styles.tabBody}>
              <Text style={styles.sectionLabel}>Physical</Text>
              <DetailRow label="Composition" value={coin.composition} icon="atom"           />
              <DetailRow label="Weight"      value={coin.weight}      icon="scale"          />
              <DetailRow label="Diameter"    value={coin.diameter}    icon="circle-outline" />
              <DetailRow label="Denomination"value={coin.denomination}icon="cash"           />
              <DetailRow label="Year"        value={yearDisplay}      icon="calendar"       />
              <DetailRow label="Country"     value={coin.country}     icon="earth"          />
              <Text style={styles.sectionLabel}>Mintage</Text>
              <DetailRow label="Total Minted" value={coin.mintCount ? coin.mintCount.toLocaleString() : 'Unknown'} icon="counter" />
              <DetailRow label="Rarity"     value={rarity.label}   icon="star-outline"  />
              <DetailRow label="Condition"  value={coin.condition} icon="certificate"   />
            </View>
          )}

          {activeTab === 'value' && (
            <View style={styles.tabBody}>
              <Text style={styles.sectionLabel}>Graded Values</Text>
              {[
                { grade: 'P–F',    label: 'Poor / Fair',        mult: 0.28 },
                { grade: 'G',      label: 'Good',               mult: 0.50 },
                { grade: 'F',      label: 'Fine',               mult: 0.75 },
                { grade: 'VF',     label: 'Very Fine',          mult: 0.90 },
                { grade: 'EF',     label: 'Extremely Fine',     mult: 1.00 },
                { grade: 'AU',     label: 'About Uncirculated', mult: 1.20 },
                { grade: 'MS',     label: 'Mint State',         mult: 1.55 },
                { grade: 'MS-65+', label: 'Gem Mint State',     mult: 2.00 },
              ].map(row => (
                <View key={row.grade} style={styles.gradeRow}>
                  <View style={styles.gradeCodeWrap}>
                    <Text style={styles.gradeCode}>{row.grade}</Text>
                  </View>
                  <Text style={styles.gradeLabel}>{row.label}</Text>
                  <Text style={styles.gradeValue}>
                    {formatCurrency(Math.round(coin.estimatedValue.mid * row.mult), currency)}
                  </Text>
                </View>
              ))}
              <View style={styles.disclaimer}>
                <MaterialCommunityIcons name="information-outline" size={13} color={colors.textMuted} />
                <Text style={styles.disclaimerText}>
                  Values are estimates based on recent market data. Actual prices vary by condition and demand.
                </Text>
              </View>
            </View>
          )}

          <View style={{ height: 130 }} />
        </ScrollView>

        {/* ── Actions ─────────────────────────────────────────────── */}
        {onAddToCollection && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.addBtn, isInCollection && styles.addBtnDone]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAddToCollection(); }}
              disabled={isInCollection}
            >
              {isInCollection ? (
                <>
                  <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                  <Text style={[styles.addBtnText, { color: colors.success }]}>In Collection</Text>
                </>
              ) : (
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.addBtnGradient}
                >
                  <MaterialCommunityIcons name="plus-circle" size={20} color={colors.onPrimary} />
                  <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>Add to Collection</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Inline meatball menu overlay ─────────────────────────────────────
            Rendered as an absolutely-positioned View (not a nested Modal) because
            React Native does not support Modals inside Modals on iOS. The backdrop
            covers the full sheet; the card sits below the ⋮ button in the hero. */}
        {menuVisible && (
          <>
            <TouchableOpacity
              style={[StyleSheet.absoluteFill, styles.menuBackdrop]}
              onPress={() => setMenuVisible(false)}
              activeOpacity={1}
            />
            <View style={styles.inlineMenu}>
              <TouchableOpacity
                style={styles.inlineMenuItem}
                onPress={() => { setMenuVisible(false); onRemove(); }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
                <Text style={styles.inlineMenuLabel}>Delete Coin</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  hero: {
    width: '100%', height: 260,
    backgroundColor: colors.surfaceContainer,
    position: 'relative',
  },
  heroImg:         { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  heroFade: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 80,
  },

  header: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  closeBtn: {
    position: 'absolute', top: spacing.lg, right: spacing.lg, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  // ⋮ sits just left of the close button (36px button + 8px gap = 44px offset)
  menuBtn: {
    position: 'absolute', top: spacing.lg, right: spacing.lg + 44, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  favBtn: {
    position: 'absolute', top: spacing.lg, left: spacing.lg, zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Inline menu overlay (avoids nested Modal — not supported on iOS)
  menuBackdrop: { zIndex: 100 },
  inlineMenu: {
    position: 'absolute',
    // Place below the hero buttons: spacing.lg (top) + 36px (btn height) + 8px gap
    top: spacing.lg + 44,
    right: spacing.lg,
    minWidth: 180,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    zIndex: 101,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  inlineMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  inlineMenuLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.error,
  },

  rarityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: borderRadius.full, borderWidth: 1,
    marginBottom: spacing.xs,
  },
  rarityBadgeText: { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 0.5 },

  coinName: { fontFamily: fonts.serif, fontSize: 20, color: colors.text, textAlign: 'center', marginBottom: 4 },
  coinMeta: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },

  valueStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    width: '100%', padding: spacing.md,
  },
  valueCell:    { flex: 1, alignItems: 'center' },
  valueCellMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.outlineVariant },
  valueCellLabel:{ fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  valueCellNum: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.text },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, gap: 5,
  },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText:       { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textMuted },
  tabTextActive: { color: colors.primary },

  body:    { flex: 1, backgroundColor: colors.background },
  tabBody: { padding: spacing.md },

  sectionLabel: {
    fontFamily: fonts.sansBold, fontSize: 11, color: colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  description: { fontFamily: fonts.sans, fontSize: 14, color: colors.textVariant, lineHeight: 22 },

  designRow:     { flexDirection: 'row', backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.outlineVariant },
  designSide:    { flex: 1 },
  designDivider: { width: 1, backgroundColor: colors.outlineVariant, marginHorizontal: spacing.md },
  designTitle:   { fontFamily: fonts.sansBold, fontSize: 9, color: colors.textMuted, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
  designText:    { fontFamily: fonts.sans, fontSize: 13, color: colors.textVariant },

  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  detailLabelWrap:{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  detailLabel:    { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted },
  detailValue:    { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text, flex: 1, textAlign: 'right' },

  tags:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  tagChip: { backgroundColor: colors.surfaceContainer, paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.outlineVariant },
  tagText: { fontFamily: fonts.sans, fontSize: 12, color: colors.textVariant },

  gradeRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, gap: spacing.sm },
  gradeCodeWrap:{ width: 60, backgroundColor: 'rgba(242,202,80,0.12)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: borderRadius.sm, alignItems: 'center' },
  gradeCode:    { fontFamily: fonts.sansBold, fontSize: 11, color: colors.primary },
  gradeLabel:   { flex: 1, fontFamily: fonts.sans, fontSize: 13, color: colors.textVariant },
  gradeValue:   { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.text },

  disclaimer:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.md },
  disclaimerText: { flex: 1, fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, lineHeight: 16 },

  actions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.md, paddingBottom: 34,
    backgroundColor: colors.surfaceLowest,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
  addBtn: {
    height: 52, borderRadius: borderRadius.md, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  addBtnDone: {
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
    backgroundColor: 'rgba(74,222,128,0.08)',
  },
  addBtnGradient: {
    flex: 1, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  addBtnText: { fontFamily: fonts.sansBold, fontSize: 15 },
});
