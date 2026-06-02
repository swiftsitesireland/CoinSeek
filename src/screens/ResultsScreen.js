import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, Share, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectCollection, setCollection, selectWishlist, selectIsInWishlist, addToWishlist, removeFromWishlist } from '../store/slices/collectionSlice';
import { selectCurrency } from '../store/slices/settingsSlice';
import { formatCurrency, currencySymbol } from '../utils/currency';
import { useStripePayment } from '../hooks/useStripePayment';
import { addCoin } from '../services/coinService';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing, borderRadius, fonts } from '../theme';
import { saveCollection } from '../services/storage';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import BlurOverlay from '../components/BlurOverlay';
import UpgradeModal from '../components/UpgradeModal';
import Toast from 'react-native-toast-message';
import { selectBadges, setGamification, addEarnedBadge, LEVEL_TITLES } from '../store/slices/gamificationSlice';
import { awardXP, checkAndAwardBadges } from '../services/gamificationService';

const { width } = Dimensions.get('window');

const METAL_LABEL_MAP = (comp = '') => {
  const c = comp.toLowerCase();
  if (c.includes('gold'))   return { label: 'GOLD',    color: '#f2ca50' };
  if (c.includes('silver')) return { label: 'SILVER',  color: '#c6c6cb' };
  if (c.includes('copper')) return { label: 'COPPER',  color: '#b87333' };
  return                           { label: 'ALLOY',   color: '#a0a0b0' };
};

/** Small "PRO" crown badge for premium-only section headers */
function ProBadge() {
  return (
    <View style={styles.proBadge}>
      <MaterialCommunityIcons name="crown" size={10} color={colors.onPrimary} />
      <Text style={styles.proBadgeText}>PRO</Text>
    </View>
  );
}

export default function ResultsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { result } = route.params || {};
  const [showBack,         setShowBack]         = useState(false);
  const [heroError,        setHeroError]        = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature,   setUpgradeFeature]   = useState('');

  const dispatch     = useDispatch();
  const { user }   = useAuth();
  const collection   = useSelector(selectCollection);
  const earnedBadges = useSelector(selectBadges);
  const wishlist     = useSelector(selectWishlist);
  const currency   = useSelector(selectCurrency);
  const isInWishlist = useSelector(selectIsInWishlist(result?.coin?.id));

  const marketAccess   = useFeatureAccess('marketValue');
  const analysisAccess = useFeatureAccess('aiAnalysis');
  const { startPayment, paymentLoading } = useStripePayment();

  if (!result?.coin) {
    return (
      <View style={styles.errorBox}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color={colors.textMuted} />
        <Text style={styles.errorText}>No coin data available</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.88}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.backPill}
          >
            <Text style={styles.backPillText}>Go Back</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    coin, confidence, analysisDetails, alternativeMatches,
    imageUri, frontImageUri, backImageUri,
  } = result;

  const displayUri   = (showBack && backImageUri) ? backImageUri : (frontImageUri || imageUri);
  const heroImageUri = heroError ? null : (displayUri || coin.imageUrl);
  const yearDisplay  = coin.year > 0 ? coin.year : coin.year < 0 ? `${Math.abs(coin.year)} BC` : 'Unknown';
  const metal        = METAL_LABEL_MAP(coin.composition);

  const isInCollection = collection.some(i => i.coin.id === coin.id);

  function fireXPToast(xpEarned, newTotal, levelAfter, badgeId) {
    Toast.show({
      type:           'xpEarned',
      position:       'bottom',
      visibilityTime: 3000,
      props: {
        xp:      xpEarned,
        badgeId: badgeId ?? null,
        newTotal,
        level:   levelAfter,
      },
    });
  }

  async function handleAwardXP(action, coinData) {
    try {
      const xpResult = await awardXP(action, {
        rarity:      coinData?.rarity,
        era:         coinData?.era,
        country:     coinData?.country,
        composition: coinData?.composition,
      });

      dispatch(setGamification({
        xp:        xpResult.new_total,
        weekXp:    xpResult.new_week_xp,
        level:     xpResult.level_after,
        levelTitle: LEVEL_TITLES[xpResult.level_after] ?? 'Pocket Change',
      }));

      const countries = new Set(collection.map((i) => i.coin?.country).filter(Boolean));
      if (coinData?.country) countries.add(coinData.country);

      const newBadges = await checkAndAwardBadges({
        action,
        metadata:       { rarity: coinData?.rarity, era: coinData?.era, composition: coinData?.composition },
        newTotal:       xpResult.new_total,
        level:          xpResult.level_after,
        earnedBadges,
        collectionSize: collection.length + (action === 'add' ? 1 : 0),
        scanCount:      0,
        countries,
      });

      newBadges.forEach((id) => dispatch(addEarnedBadge(id)));
      fireXPToast(xpResult.xp_earned, xpResult.new_total, xpResult.level_after, newBadges[0] ?? null);
    } catch (e) {
      console.warn('handleAwardXP error:', e.message);
    }
  }

  const xpFiredRef = React.useRef(false);
  React.useEffect(() => {
    if (coin && !xpFiredRef.current) {
      xpFiredRef.current = true;
      handleAwardXP('scan', coin);
    }
  }, []);

  function handleUpgradeFor(featureName) {
    setUpgradeFeature(featureName);
    setShowUpgradeModal(true);
  }

  async function handleUpgradeContinue(plan) {
    const success = await startPayment(plan);
    if (success) setShowUpgradeModal(false);
  }

  async function handleAdd() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInCollection || saving) return;
    if (!user?.id) {
      Toast.show({ type: 'error', text1: 'Session expired', text2: 'Please sign in again to save coins.' });
      return;
    }
    setSaving(true);
    try {
      const entry = {
        coin,
        quantity: 1,
        condition: coin.condition,
        purchasePrice: coin.estimatedValue.mid,
        notes: '',
        dateAdded: new Date().toISOString(),
        frontImageUri: frontImageUri || null,
        backImageUri:  backImageUri  || null,
      };
      const saved = await addCoin(entry, user.id);
      const updatedCollection = [saved, ...collection];
      dispatch(setCollection(updatedCollection));
      await saveCollection(updatedCollection);
      if (saved.__syncPending) {
        Toast.show({ type: 'info', text1: 'Saved locally', text2: 'No connection — will sync when online' });
      } else {
        Toast.show({ type: 'success', text1: 'Added to Collection', text2: coin.name });
      }
      handleAwardXP('add', coin);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to save', text2: e.message });
    } finally {
      setSaving(false);
    }
  }

  function handleWishlist() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isInWishlist) {
      const wishlistItem = wishlist.find((i) => i.coin.id === coin.id);
      if (wishlistItem) dispatch(removeFromWishlist(wishlistItem.id));
      Toast.show({ type: 'info', text1: 'Removed from Wishlist', text2: coin.name });
    } else {
      dispatch(addToWishlist(coin));
      Toast.show({ type: 'success', text1: 'Added to Wishlist', text2: coin.name });
    }
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `I identified a ${coin.name} (${coin.country}, ${yearDisplay}) worth ~${formatCurrency(coin.estimatedValue.mid, currency)} using CoinSeek!`,
      });
    } catch (_) {}
  }

  const specs = [
    { icon: 'earth',    label: 'Country',      value: coin.country },
    { icon: 'calendar', label: 'Year',         value: yearDisplay },
    { icon: 'cash',     label: 'Denomination', value: coin.denomination },
    { icon: 'factory',  label: 'Mint',         value: coin.mintMark || coin.mint?.split(' ')[0] || '—' },
    { icon: 'atom',     label: 'Metal',        value: coin.composition.split(',')[0] },
    { icon: 'scale',    label: 'Weight',       value: coin.weight },
  ];

  return (
    <View style={styles.root}>
      <UpgradeModal
        visible={showUpgradeModal}
        featureName={upgradeFeature}
        loading={paymentLoading}
        onContinue={handleUpgradeContinue}
        onClose={() => !paymentLoading && setShowUpgradeModal(false)}
      />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero image ──────────────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          {heroImageUri ? (
            <Image
              source={{ uri: heroImageUri }}
              style={styles.heroImage}
              resizeMode="cover"
              onError={() => setHeroError(true)}
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <MaterialCommunityIcons name="circle-double" size={80} color={colors.primary} />
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(19,19,19,0.95)']}
            style={styles.heroGradient}
          />

          <TouchableOpacity style={[styles.backBtn, { top: insets.top + 12 }]} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.shareBtn, { top: insets.top + 12 }]} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant-outline" size={20} color="#fff" />
          </TouchableOpacity>

          {confidence != null && (
            <View style={[styles.confBadge, {
              backgroundColor: confidence >= 80
                ? 'rgba(74,222,128,0.9)'
                : confidence >= 60
                  ? 'rgba(234,179,8,0.9)'
                  : 'rgba(251,146,60,0.9)',
            }]}>
              <MaterialCommunityIcons name="check-decagram" size={13} color="#000" />
              <Text style={styles.confText}>{confidence}% match</Text>
            </View>
          )}

          {frontImageUri && backImageUri && (
            <View style={styles.sideToggle}>
              <TouchableOpacity
                style={[styles.sideBtn, !showBack && styles.sideBtnActive]}
                onPress={() => { setShowBack(false); setHeroError(false); }}
              >
                <Text style={[styles.sideBtnText, !showBack && styles.sideBtnTextActive]}>Front</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sideBtn, showBack && styles.sideBtnActive]}
                onPress={() => { setShowBack(true); setHeroError(false); }}
              >
                <Text style={[styles.sideBtnText, showBack && styles.sideBtnTextActive]}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.heroInfo}>
            <View style={[styles.metalBadge, { backgroundColor: metal.color + '22' }]}>
              <Text style={[styles.metalBadgeText, { color: metal.color }]}>{metal.label}</Text>
            </View>
            <Text style={styles.coinName}>{coin.name}</Text>
            <Text style={styles.coinMeta}>{coin.country} · {yearDisplay} · {coin.denomination}</Text>
          </View>
        </View>

        {/* ── Market value (PREMIUM) ───────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>MARKET VALUE</Text>
            {!marketAccess.isAvailable && <ProBadge />}
          </View>

          {marketAccess.isAvailable ? (
            <View style={styles.valueCard}>
              <View style={styles.valueRow}>
                <View style={styles.valueCell}>
                  <Text style={styles.valueCellLabel}>Low</Text>
                  <Text style={styles.valueCellFig}>{formatCurrency(coin.estimatedValue.low, currency)}</Text>
                </View>
                <View style={styles.valueMidCell}>
                  <Text style={[styles.valueCellLabel, { color: colors.primary }]}>Est. Value</Text>
                  <Text style={styles.valueMidFig}>{formatCurrency(coin.estimatedValue.mid, currency)}</Text>
                </View>
                <View style={styles.valueCell}>
                  <Text style={styles.valueCellLabel}>High</Text>
                  <Text style={styles.valueCellFig}>{formatCurrency(coin.estimatedValue.high, currency)}</Text>
                </View>
              </View>
            </View>
          ) : (
            <BlurOverlay
              featureName="Market Value"
              onUpgrade={() => handleUpgradeFor('Market Value')}
            >
              <View style={styles.valueCard}>
                <View style={styles.valueRow}>
                  <View style={styles.valueCell}>
                    <Text style={styles.valueCellLabel}>Low</Text>
                    <Text style={styles.valueCellFig}>{currencySymbol(currency)}—</Text>
                  </View>
                  <View style={styles.valueMidCell}>
                    <Text style={[styles.valueCellLabel, { color: colors.primary }]}>Est. Value</Text>
                    <Text style={styles.valueMidFig}>{currencySymbol(currency)}—</Text>
                  </View>
                  <View style={styles.valueCell}>
                    <Text style={styles.valueCellLabel}>High</Text>
                    <Text style={styles.valueCellFig}>{currencySymbol(currency)}—</Text>
                  </View>
                </View>
              </View>
            </BlurOverlay>
          )}
        </View>

        {/* ── Specifications (always free) ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SPECIFICATIONS</Text>
          <View style={styles.specsGrid}>
            {specs.map(s => (
              <View key={s.label} style={styles.specCell}>
                <MaterialCommunityIcons name={s.icon} size={18} color={colors.primary} />
                <Text style={styles.specLabel}>{s.label}</Text>
                <Text style={styles.specValue} numberOfLines={1}>{s.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── AI Analysis (PREMIUM) ────────────────────────────────────── */}
        {analysisDetails && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>AI ANALYSIS</Text>
              {!analysisAccess.isAvailable && <ProBadge />}
            </View>

            {analysisAccess.isAvailable ? (
              <View style={styles.analysisCard}>
                {Object.entries(analysisDetails).map(([key, val]) => {
                  const iconMap  = { edgeDetection: 'vector-circle', surfaceAnalysis: 'texture', inscriptionMatch: 'alphabetical', metalDetection: 'atom', sizeEstimate: 'ruler' };
                  const labelMap = { edgeDetection: 'Edge Detection', surfaceAnalysis: 'Surface', inscriptionMatch: 'Inscription', metalDetection: 'Metal', sizeEstimate: 'Size' };
                  return (
                    <View key={key} style={styles.analysisRow}>
                      <MaterialCommunityIcons name={iconMap[key] || 'information'} size={15} color={colors.primary} />
                      <Text style={styles.analysisLabel}>{labelMap[key] || key}</Text>
                      <Text style={styles.analysisValue} numberOfLines={1}>{val}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <BlurOverlay
                featureName="AI Analysis"
                onUpgrade={() => handleUpgradeFor('AI Analysis')}
              >
                <View style={styles.analysisCard}>
                  {Object.entries(analysisDetails).map(([key, val]) => {
                    const labelMap = { edgeDetection: 'Edge Detection', surfaceAnalysis: 'Surface', inscriptionMatch: 'Inscription', metalDetection: 'Metal', sizeEstimate: 'Size' };
                    return (
                      <View key={key} style={styles.analysisRow}>
                        <View style={{ width: 15, height: 15, backgroundColor: colors.outlineVariant, borderRadius: 4 }} />
                        <Text style={styles.analysisLabel}>{labelMap[key] || key}</Text>
                        <Text style={styles.analysisValue} numberOfLines={1}>{val}</Text>
                      </View>
                    );
                  })}
                </View>
              </BlurOverlay>
            )}
          </View>
        )}

        {/* ── Rarity Assessment (PREMIUM placeholder) ──────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>RARITY ASSESSMENT</Text>
            {!marketAccess.isAvailable && <ProBadge />}
          </View>
          {marketAccess.isAvailable ? (
            <View style={styles.rarityCard}>
              <View style={styles.rarityRow}>
                <MaterialCommunityIcons name="diamond-stone" size={20} color={colors.primary} />
                <Text style={styles.rarityLabel}>Rarity Level</Text>
                <Text style={[styles.rarityValue, { color: colors.primary }]}>
                  {coin.rarity ? coin.rarity.charAt(0).toUpperCase() + coin.rarity.slice(1) : 'Common'}
                </Text>
              </View>
              <View style={styles.rarityRow}>
                <MaterialCommunityIcons name="counter" size={20} color={colors.textMuted} />
                <Text style={styles.rarityLabel}>Mint Count</Text>
                <Text style={styles.rarityValue}>
                  {coin.mintCount ? coin.mintCount.toLocaleString() : 'N/A'}
                </Text>
              </View>
            </View>
          ) : (
            <BlurOverlay
              featureName="Rarity Assessment"
              onUpgrade={() => handleUpgradeFor('Rarity Assessment')}
            >
              <View style={styles.rarityCard}>
                <View style={styles.rarityRow}>
                  <MaterialCommunityIcons name="diamond-stone" size={20} color={colors.primary} />
                  <Text style={styles.rarityLabel}>Rarity Level</Text>
                  <Text style={[styles.rarityValue, { color: colors.primary }]}>Rare</Text>
                </View>
                <View style={styles.rarityRow}>
                  <MaterialCommunityIcons name="counter" size={20} color={colors.textMuted} />
                  <Text style={styles.rarityLabel}>Mint Count</Text>
                  <Text style={styles.rarityValue}>1,500,000</Text>
                </View>
              </View>
            </BlurOverlay>
          )}
        </View>

        {/* ── Alternative matches (always free) ───────────────────────── */}
        {alternativeMatches?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ALTERNATIVE MATCHES</Text>
            {alternativeMatches.map(({ coin: alt, confidence: altConf }) => (
              <TouchableOpacity
                key={alt.id}
                style={styles.altRow}
                onPress={() => navigation.replace('Results', { result: { coin: alt, confidence: altConf } })}
                activeOpacity={0.8}
              >
                <View style={styles.altIcon}>
                  <MaterialCommunityIcons name="circle-double" size={22} color={colors.primary} />
                </View>
                <View style={styles.altInfo}>
                  <Text style={styles.altName}>{alt.name}</Text>
                  <Text style={styles.altMeta}>{alt.country} · {alt.year > 0 ? alt.year : `${Math.abs(alt.year)} BC`}</Text>
                </View>
                <Text style={styles.altConf}>{altConf}%</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Bottom action bar ─────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.wishlistBtn, isInWishlist && styles.wishlistBtnActive]}
          onPress={handleWishlist}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name={isInWishlist ? 'heart' : 'heart-outline'}
            size={22}
            color={isInWishlist ? colors.error : colors.textMuted}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, isInCollection && styles.addBtnDone]}
          onPress={handleAdd}
          disabled={saving || isInCollection}
          activeOpacity={0.88}
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
              <MaterialCommunityIcons name={saving ? 'loading' : 'plus'} size={20} color={colors.onPrimary} />
              <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>
                {saving ? 'Saving…' : 'Add to Collection'}
              </Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const SPEC_W = (width - spacing.edge * 2 - spacing.gutter * 2) / 3;

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: colors.background },
  errorBox:  { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  errorText: { fontFamily: fonts.sans, fontSize: 16, color: colors.textMuted },
  backPill:  { paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: borderRadius.md },
  backPillText: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.onPrimary },

  // Hero
  heroWrap:        { width: '100%', height: 360, position: 'relative' },
  heroImage:       { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainer },
  heroGradient:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 220 },
  backBtn:         { position: 'absolute', left: spacing.edge, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  shareBtn:        { position: 'absolute', right: spacing.edge, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  confBadge:       { position: 'absolute', top: 70, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: borderRadius.full },
  confText:        { fontFamily: fonts.sansBold, fontSize: 12, color: '#000' },
  sideToggle:      { position: 'absolute', bottom: 64, right: spacing.edge, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: borderRadius.full, padding: 3 },
  sideBtn:         { paddingHorizontal: 14, paddingVertical: 5, borderRadius: borderRadius.full },
  sideBtnActive:   { backgroundColor: colors.primary },
  sideBtnText:     { fontFamily: fonts.sansMedium, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  sideBtnTextActive: { color: colors.onPrimary },
  heroInfo:        { position: 'absolute', bottom: spacing.lg, left: spacing.edge, right: spacing.edge, gap: 5 },
  metalBadge:      { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full, marginBottom: 2 },
  metalBadgeText:  { fontFamily: fonts.sansBold, fontSize: 10, letterSpacing: 0.8 },
  coinName:        { fontFamily: fonts.serif, fontSize: 26, color: '#fff', lineHeight: 32 },
  coinMeta:        { fontFamily: fonts.sans,  fontSize: 13, color: 'rgba(255,255,255,0.65)' },

  // Section
  section:         { paddingHorizontal: spacing.edge, marginBottom: spacing.lg, marginTop: spacing.md },
  sectionLabel:    { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.sm },
  sectionHeaderRow:{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },

  // PRO badge
  proBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, paddingHorizontal: 7, paddingVertical: 3, borderRadius: borderRadius.sm },
  proBadgeText: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.onPrimary, letterSpacing: 0.5 },

  // Value card
  valueCard:      { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.lg },
  valueRow:       { flexDirection: 'row', alignItems: 'center' },
  valueCell:      { flex: 1, alignItems: 'center' },
  valueMidCell:   { flex: 1.5, alignItems: 'center' },
  valueCellLabel: { fontFamily: fonts.sans,       fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  valueCellFig:   { fontFamily: fonts.sansMedium, fontSize: 16, color: colors.text },
  valueMidFig:    { fontFamily: fonts.serif,      fontSize: 28, color: colors.primary },

  // Specs
  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.gutter },
  specCell:  { width: SPEC_W, backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.sm, alignItems: 'center', gap: 4 },
  specLabel: { fontFamily: fonts.sans,       fontSize: 10, color: colors.textMuted },
  specValue: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.text, textAlign: 'center' },

  // Analysis
  analysisCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden' },
  analysisRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, gap: spacing.sm },
  analysisLabel:{ flex: 1,   fontFamily: fonts.sans,       fontSize: 13, color: colors.textVariant },
  analysisValue:{ flex: 1.5, fontFamily: fonts.sansMedium, fontSize: 12, color: colors.text, textAlign: 'right' },

  // Rarity
  rarityCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden' },
  rarityRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, gap: spacing.sm },
  rarityLabel:{ flex: 1,   fontFamily: fonts.sans,       fontSize: 14, color: colors.textVariant },
  rarityValue:{ fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },

  // Alt matches
  altRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.md, marginBottom: 8, gap: spacing.md },
  altIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(242,202,80,0.12)', alignItems: 'center', justifyContent: 'center' },
  altInfo: { flex: 1 },
  altName: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text, marginBottom: 2 },
  altMeta: { fontFamily: fonts.sans,       fontSize: 12, color: colors.textMuted },
  altConf: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textVariant },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.edge, paddingTop: spacing.md,
    backgroundColor: colors.surfaceLowest,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  wishlistBtn: {
    width: 52, height: 52, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    flexShrink: 0,
  },
  wishlistBtnActive: {
    borderColor: 'rgba(255,100,100,0.4)',
    backgroundColor: 'rgba(255,100,100,0.08)',
  },
  addBtn: {
    flex: 1,
    borderRadius: borderRadius.md, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
  },
  addBtnDone: {
    paddingVertical: 15,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderRadius: borderRadius.md,
  },
  addBtnGradient: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 15, borderRadius: borderRadius.md,
  },
  addBtnText: { fontFamily: fonts.sansBold, fontSize: 16 },
});
