import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  selectCollection, selectCollectionTotal,
  removeFromCollection, setCollection,
} from '../store/slices/collectionSlice';
import { selectCurrency } from '../store/slices/settingsSlice';
import { formatCurrency } from '../utils/currency';
import { deleteCoin, getUserCoins } from '../services/coinService';
import { loadCollection, saveCollection } from '../services/storage';
import { useAuth } from '../auth/AuthContext';
import { GridCoinCard } from '../components/CoinCard';
import CoinDetailsModal from '../components/CoinDetailsModal';
import BlurOverlay from '../components/BlurOverlay';
import UpgradeModal from '../components/UpgradeModal';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useStripePayment } from '../hooks/useStripePayment';
import { colors, spacing, borderRadius, fonts, typography, shadows } from '../theme';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');
const COLUMN_GAP = spacing.gutter;
const CARD_WIDTH = (width - spacing.edge * 2 - COLUMN_GAP) / 2;

const FILTER_CHIPS = [
  { id: 'year',    label: 'Year',    icon: 'calendar-blank-outline' },
  { id: 'country', label: 'Country', icon: 'earth'                  },
  { id: 'metal',   label: 'Metal',   icon: 'atom'                   },
];

const SORT_MAP = {
  year:    (a, b) => b.coin.year - a.coin.year,
  country: (a, b) => a.coin.country.localeCompare(b.coin.country),
  metal:   (a, b) => a.coin.composition.localeCompare(b.coin.composition),
};

function GradeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.premCard}>
        <Text style={styles.gradeEmpty}>
          Add coins to your collection to see how their grades break down.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.premCard}>
      {data.map(({ grade, pct }) => (
        <View key={grade} style={styles.gradeRow}>
          <Text style={styles.gradeLabel}>{grade}</Text>
          <View style={styles.gradeBarBg}>
            <View style={[styles.gradeBarFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.gradePct}>{pct}%</Text>
        </View>
      ))}
    </View>
  );
}

function FilterChip({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons name={icon} size={13} color={active ? colors.onPrimary : colors.textMuted} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function CollectionScreen({ navigation }) {
  const insets    = useSafeAreaInsets();
  const dispatch  = useDispatch();
  const { user }  = useAuth();
  const collection = useSelector(selectCollection);
  const totalValue = useSelector(selectCollectionTotal);
  const currency   = useSelector(selectCurrency);

  const [search,           setSearch]           = useState('');
  const [activeFilter,     setActiveFilter]     = useState(null);
  const [selectedCoin,     setSelectedCoin]     = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature,   setUpgradeFeature]   = useState('');
  const [showAll,          setShowAll]          = useState(false);

  const statsAccess  = useFeatureAccess('advancedStats');
  const { startPayment, paymentLoading } = useStripePayment();

  function handleUpgradeFor(feature) {
    setUpgradeFeature(feature);
    setShowUpgradeModal(true);
  }

  async function handleUpgradeContinue(plan) {
    const success = await startPayment(plan);
    if (success) setShowUpgradeModal(false);
  }

  // Load collection on mount — first try Supabase, fall back to AsyncStorage
  useEffect(() => {
    async function load() {
      try {
        if (!user?.id) return;
        const coins = await getUserCoins(user.id);
        if (coins.length > 0) dispatch(setCollection(coins));
      } catch {
        const local = await loadCollection();
        if (local.length > 0) dispatch(setCollection(local));
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = collection;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(i =>
        i.coin.name.toLowerCase().includes(q) ||
        i.coin.country.toLowerCase().includes(q) ||
        i.coin.year.toString().includes(q)
      );
    }
    if (activeFilter && SORT_MAP[activeFilter]) {
      r = [...r].sort(SORT_MAP[activeFilter]);
    } else {
      r = [...r].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    }
    return r;
  }, [collection, search, activeFilter]);

  async function handleRemove(item) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove Coin', `Remove "${item.coin.name}" from your collection?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await deleteCoin(item.id);
            dispatch(removeFromCollection(item.id));
            const remaining = collection.filter(c => c.id !== item.id);
            await saveCollection(remaining);
            Toast.show({ type: 'success', text1: 'Removed', text2: item.coin.name });
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Failed to remove', text2: e.message });
          }
        },
      },
    ]);
  }

  useEffect(() => { setShowAll(false); }, [search, activeFilter]);

  function toggleFilter(id) {
    setActiveFilter(v => v === id ? null : id);
  }

  // Real grade distribution computed from the user's coins. Each coin's grade
  // comes from its condition string (e.g. "MS-65"); we bucket by the leading
  // grade code, take the most common, and show their share of the collection.
  const gradeDistribution = useMemo(() => {
    const counts = {};
    collection.forEach((item) => {
      const raw = (item.condition || item.coin?.condition || '').trim();
      const grade = raw ? raw.split(/\s|·/)[0].toUpperCase() : 'Ungraded';
      counts[grade] = (counts[grade] || 0) + 1;
    });
    const total = collection.length;
    if (!total) return [];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([grade, n]) => ({ grade, pct: Math.round((n / total) * 100) }));
  }, [collection]);

  const RECENT_LIMIT = 10;
  const canViewAll = filtered.length > RECENT_LIMIT;
  const displayed  = showAll ? filtered : filtered.slice(0, RECENT_LIMIT);

  function renderGridItem({ item, index }) {
    const isLeft = index % 2 === 0;
    return (
      <View style={[styles.gridItem, isLeft ? { marginRight: COLUMN_GAP / 2 } : { marginLeft: COLUMN_GAP / 2 }]}>
        <GridCoinCard
          item={item}
          onPress={() => setSelectedCoin(item)}
          onInfoPress={() => setSelectedCoin(item)}
        />
      </View>
    );
  }

  const ListHeader = (
    <View>
      {/* ── Stats ───────────────────────────────────────────────────── */}
      <View style={styles.statsSection}>
        <View style={styles.statBlock}>
          <Text style={styles.statCaps}>TOTAL COLLECTION VALUE</Text>
          <View style={styles.valueRow}>
            <Text style={styles.statValue}>
              {formatCurrency(totalValue, currency, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <Text style={styles.statCaption}>
            Based on estimated market value
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBlock}>
          <Text style={styles.statCaps}>TOTAL COINS</Text>
          <View style={styles.valueRow}>
            <Text style={styles.statValue}>{collection.length}</Text>
            <MaterialCommunityIcons name="layers-outline" size={20} color={colors.textMuted} />
          </View>
        </View>
      </View>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search collection..."
          placeholderTextColor={colors.textMuted}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter chips ────────────────────────────────────────────── */}
      <View style={styles.chipsRow}>
        {FILTER_CHIPS.map(c => (
          <FilterChip
            key={c.id}
            label={c.label}
            icon={c.icon}
            active={activeFilter === c.id}
            onPress={() => toggleFilter(c.id)}
          />
        ))}
      </View>

      {/* ── Premium: Grade Distribution (computed from real coins) ───── */}
      <View style={styles.premSection}>
        <View style={styles.premHeader}>
          <Text style={styles.sectionTitle}>Grade Distribution</Text>
          {!statsAccess.isAvailable && (
            <View style={styles.proBadge}>
              <MaterialCommunityIcons name="crown" size={10} color={colors.onPrimary} />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        {statsAccess.isAvailable ? (
          <GradeChart data={gradeDistribution} />
        ) : (
          <BlurOverlay
            featureName="Grade Distribution"
            onUpgrade={() => handleUpgradeFor('Grade Distribution')}
          >
            <GradeChart data={gradeDistribution} />
          </BlurOverlay>
        )}
      </View>

      {/* ── Section header ──────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{showAll ? 'All Coins' : 'Recently Added'}</Text>
        {canViewAll && (
          <TouchableOpacity onPress={() => setShowAll(v => !v)}>
            <Text style={styles.viewAllText}>{showAll ? 'Show Less' : 'View All'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <UpgradeModal
        visible={showUpgradeModal}
        featureName={upgradeFeature}
        loading={paymentLoading}
        onContinue={handleUpgradeContinue}
        onClose={() => !paymentLoading && setShowUpgradeModal(false)}
      />

      {/* ── Page title ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Collection</Text>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={i => i.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={ListHeader}
        renderItem={renderGridItem}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="layers-outline" size={64} color={colors.outlineVariant} />
            <Text style={styles.emptyTitle}>No coins yet</Text>
            <Text style={styles.emptySub}>Scan a coin to add it to your collection</Text>
          </View>
        }
      />

      {/* ── Floating scan FAB ───────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate('Scan'); }}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="line-scan" size={26} color={colors.onPrimary} />
        </LinearGradient>
      </TouchableOpacity>

      <CoinDetailsModal
        visible={!!selectedCoin}
        coin={selectedCoin?.coin}
        collectionItem={selectedCoin}
        onClose={() => setSelectedCoin(null)}
        isInCollection
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.edge,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  pageTitle: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.primary,
    letterSpacing: 0.2,
  },

  listContent:   { paddingHorizontal: spacing.edge, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  gridItem:      { width: CARD_WIDTH, marginBottom: spacing.gutter },

  // Stats
  statsSection: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statBlock:   { gap: 4 },
  statCaps:    { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  valueRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statValue:   { fontFamily: fonts.serif, fontSize: 28, color: colors.text },
  changePill:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(74,222,128,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  changeText:  { fontFamily: fonts.sansBold, fontSize: 11, color: colors.success },
  statCaption: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
  statDivider: { height: 1, backgroundColor: colors.outlineVariant },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon:  { marginRight: spacing.sm },
  searchInput: { flex: 1, fontFamily: fonts.sans, color: colors.text, fontSize: 15, paddingVertical: 12 },
  clearBtn:    { padding: 4 },

  // Chips
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  chipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:       { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: colors.onPrimary },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.text },
  viewAllText:  { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.primary },

  // Empty
  empty:      { alignItems: 'center', paddingTop: 48, gap: spacing.sm },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.text },
  emptySub:   { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted, textAlign: 'center' },

  // Premium sections
  premSection: { paddingHorizontal: spacing.edge, marginBottom: spacing.lg },
  premHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  premCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    padding: spacing.md, gap: 10,
  },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  proBadgeText: { fontFamily: fonts.sansBold, fontSize: 9, color: colors.onPrimary, letterSpacing: 0.5 },

  // Grade chart
  gradeRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gradeLabel:  { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textMuted, width: 44 },
  gradeBarBg:  { flex: 1, height: 6, backgroundColor: colors.outlineVariant, borderRadius: 3, overflow: 'hidden' },
  gradeBarFill:{ height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  gradePct:    { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, width: 32, textAlign: 'right' },
  gradeEmpty:  { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, lineHeight: 19, textAlign: 'center', paddingVertical: spacing.sm },

  // Trends
  trendsCard:  { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  trendsTitle:   { fontFamily: fonts.serif, fontSize: 32, color: colors.success },
  trendsSub:     { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted },
  trendsSample:  { fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, opacity: 0.6 },

  // FAB
  fab: {
    position: 'absolute', bottom: 28, right: spacing.edge,
    ...shadows.gold,
  },
  fabGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
});
