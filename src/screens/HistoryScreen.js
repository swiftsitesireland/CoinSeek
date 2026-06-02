import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectHistory, clearHistory, removeScan } from '../store/slices/historySlice';
import { selectCurrency } from '../store/slices/settingsSlice';
import { formatCurrency } from '../utils/currency';
import { saveHistory } from '../services/storage';
import { colors, spacing, borderRadius, rarityConfig } from '../theme';
import Toast from 'react-native-toast-message';

function normalizeHistoryItem(item) {
  return {
    ...item,
    coin: {
      name:          '',
      country:       '',
      year:          0,
      denomination:  '',
      composition:   '',
      mintMark:      '',
      weight:        '',
      diameter:      '',
      rarity:        'common',
      condition:     '',
      confidence:    0,
      ...item.coin,
    },
  };
}

function ScanRow({ item, onPress, onDelete }) {
  const rarity = rarityConfig[item.coin?.rarity] || rarityConfig.common;
  const currency = useSelector(selectCurrency);
  const date   = new Date(item.scannedAt);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.rowAccent, { backgroundColor: rarity.color }]} />
      <View style={[styles.rowIcon, { backgroundColor: rarity.color + '22' }]}>
        <MaterialCommunityIcons name="circle-double" size={22} color={rarity.color} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{item.coin?.name || 'Unknown'}</Text>
        <Text style={styles.rowMeta}>
          {item.coin?.country} · {item.coin?.year > 0 ? item.coin.year : item.coin?.year < 0 ? `${Math.abs(item.coin.year)} BC` : 'Unknown'}
        </Text>
        <Text style={styles.rowDate}>
          {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {item.coin?.estimatedValue && (
          <Text style={styles.rowValue}>{formatCurrency(item.coin.estimatedValue.mid, currency)}</Text>
        )}
        {item.confidence != null && (
          <Text style={styles.rowConf}>{item.confidence}% match</Text>
        )}
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <MaterialCommunityIcons name="close" size={15} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen({ navigation }) {
  const dispatch = useDispatch();
  const history  = useSelector(selectHistory);
  const currency = useSelector(selectCurrency);
  const [filter, setFilter] = useState('all');

  const filtered = history.filter((s) => {
    if (filter === 'rare')     return ['rare', 'very rare', 'legendary'].includes(s.coin?.rarity);
    if (filter === 'valuable') return (s.coin?.estimatedValue?.mid || 0) >= 100;
    return true;
  });

  const totalScanned = history.length;
  const rareFound    = history.filter((s) => ['rare', 'very rare', 'legendary'].includes(s.coin?.rarity)).length;
  const topValue     = Math.max(...history.map((s) => s.coin?.estimatedValue?.mid || 0), 0);

  async function handleClearAll() {
    Alert.alert('Clear History', 'Delete all scan history? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: async () => {
        dispatch(clearHistory());
        await saveHistory([]);
        Toast.show({ type: 'success', text1: 'History cleared' });
      }},
    ]);
  }

  async function handleDelete(id) {
    dispatch(removeScan(id));
    await saveHistory(history.filter((s) => s.id !== id));
  }

  return (
    <View style={styles.root}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Scan History</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={styles.clearAll}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{totalScanned}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.rare }]}>{rareFound}</Text>
            <Text style={styles.statLabel}>Rare Found</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: colors.sage }]}>
              {topValue > 0 ? formatCurrency(topValue, currency) : '—'}
            </Text>
            <Text style={styles.statLabel}>Top Value</Text>
          </View>
        </View>
      </View>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <View style={styles.filters}>
        {[
          { id: 'all',      label: 'All Scans'  },
          { id: 'rare',     label: 'Rare Finds' },
          { id: 'valuable', label: '$100+'       },
        ].map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterChipText, filter === f.id && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ───────────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ScanRow
            item={item}
            onPress={() => navigation.navigate('Results', { result: normalizeHistoryItem(item) })}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="history" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No scan history</Text>
            <Text style={styles.emptySub}>
              {filter !== 'all' ? 'Try a different filter' : 'Start scanning coins to build your history'}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity style={styles.emptyCta} onPress={() => navigation.navigate('ScanMain')}>
                <Text style={styles.emptyCtaText}>Scan First Coin</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: spacing.md,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  clearAll: { fontSize: 13, fontWeight: '700', color: colors.error },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceMid,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 2 },

  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '800' },

  list: { padding: spacing.md },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: 8,
    gap: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  rowAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  rowMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  rowDate: { fontSize: 11, color: colors.textMuted },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowValue: { fontSize: 15, fontWeight: '800', color: colors.sage },
  rowConf: { fontSize: 11, color: colors.textMuted },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  emptyCta: { marginTop: spacing.md, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.full },
  emptyCtaText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
