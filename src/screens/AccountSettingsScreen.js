import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  selectSettings, toggleNotifications, setCurrency, toggleSaveScansToGallery,
  updateProfile,
} from '../store/slices/settingsSlice';
import { clearAllData } from '../services/storage';
import { setCollection } from '../store/slices/collectionSlice';
import { clearHistory } from '../store/slices/historySlice';
import { signOut, updateProfile as updateProfileService } from '../services/authService';
import { supabase } from '../config/supabase';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing, borderRadius, fonts } from '../theme';
import Toast from 'react-native-toast-message';

function SettingRow({ icon, label, sub, right, onPress, danger }) {
  return (
    <TouchableOpacity
      style={[styles.row, danger && styles.rowDanger]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <MaterialCommunityIcons name={icon} size={18} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: colors.error }]}>{label}</Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {right}
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function AccountSettingsScreen({ navigation }) {
  const insets   = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const settings = useSelector(selectSettings);

  // Prefer a locally-edited name; fall back to the auth metadata from sign-up.
  const currentName =
    (settings.userProfile?.name && settings.userProfile.name !== 'Collector')
      ? settings.userProfile.name
      : (user?.user_metadata?.full_name || user?.user_metadata?.username || 'Collector');

  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState(currentName);
  const [savingName,  setSavingName]  = useState(false);

  function startEditName() {
    setNameInput(currentName);
    setEditingName(true);
  }

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === currentName) { setEditingName(false); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSavingName(true);
    // Update Redux immediately so the UI reflects the change and it persists locally.
    dispatch(updateProfile({ name: trimmed }));
    try {
      // display_name is free-form (no uniqueness constraint), safe to update directly.
      await updateProfileService({ display_name: trimmed });
      Toast.show({ type: 'success', text1: 'Name updated' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Saved on device', text2: 'Could not sync to the server — will retry later.' });
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  }

  async function handleDeleteAccount() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all your coins, and cancel any active subscription. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation — GDPR best practice
            Alert.alert(
              'Are you sure?',
              'Your account will be deleted immediately and cannot be recovered.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
                      if (error) throw error;
                      // Sign out locally — auth record is gone server-side
                      await clearAllData();
                      dispatch(setCollection([]));
                      dispatch(clearHistory());
                      await signOut().catch(() => {}); // may fail since account is deleted
                      Toast.show({ type: 'success', text1: 'Account deleted', text2: 'We\'re sorry to see you go.' });
                    } catch (e) {
                      Toast.show({ type: 'error', text1: 'Deletion failed', text2: 'Please contact support@coinseek.app' });
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  async function handleClearData() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Clear All Data', 'Permanently delete your local history and cached data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear Everything', style: 'destructive', onPress: async () => {
          await clearAllData();
          dispatch(setCollection([]));
          dispatch(clearHistory());
          Toast.show({ type: 'success', text1: 'All data cleared' });
        },
      },
    ]);
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Account Settings</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Profile name ────────────────────────────────────────────── */}
        <Section title="PROFILE">
          {editingName ? (
            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <MaterialCommunityIcons name="account-outline" size={18} color={colors.primary} />
              </View>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                returnKeyType="done"
                editable={!savingName}
                onSubmitEditing={handleSaveName}
              />
              <TouchableOpacity onPress={handleSaveName} disabled={savingName} style={styles.nameSaveBtn}>
                {savingName
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
            </View>
          ) : (
            <SettingRow
              icon="account-outline"
              label="Full Name"
              sub={currentName}
              onPress={startEditName}
              right={<MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textMuted} />}
            />
          )}
          <SettingRow
            icon="email-outline"
            label="Email Address"
            sub={user?.email || 'No email set'}
            right={
              <TouchableOpacity
                onPress={() => Toast.show({
                  type: 'info',
                  text1: 'Email cannot be changed here',
                  text2: 'Contact support@coinseek.app to update your email.',
                })}
              >
                <MaterialCommunityIcons name="information-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            }
          />
        </Section>

        {/* ── Preferences ─────────────────────────────────────────────── */}
        <Section title="PREFERENCES">
          <SettingRow
            icon="bell-outline"
            label="Push Notifications"
            sub="Scan alerts and market updates"
            right={
              <Switch
                value={settings.notifications}
                onValueChange={() => dispatch(toggleNotifications())}
                trackColor={{ false: colors.outlineVariant, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
          <SettingRow
            icon="currency-usd"
            label="Display Currency"
            sub={`Currently: ${settings.currency}`}
            onPress={() =>
              Alert.alert('Currency', 'Choose display currency', [
                { text: 'USD ($)', onPress: () => dispatch(setCurrency('USD')) },
                { text: 'EUR (€)', onPress: () => dispatch(setCurrency('EUR')) },
                { text: 'GBP (£)', onPress: () => dispatch(setCurrency('GBP')) },
                { text: 'Cancel',  style: 'cancel' },
              ])
            }
            right={<MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />}
          />
          <SettingRow
            icon="image-multiple-outline"
            label="Save Scans to Gallery"
            sub="Auto-save coin photos"
            right={
              <Switch
                value={settings.saveScansToGallery ?? false}
                onValueChange={() => dispatch(toggleSaveScansToGallery())}
                trackColor={{ false: colors.outlineVariant, true: colors.primary }}
                thumbColor="#fff"
              />
            }
          />
        </Section>

        {/* ── Security ────────────────────────────────────────────────── */}
        <Section title="SECURITY">
          <SettingRow
            icon="shield-lock-outline"
            label="Privacy & Security"
            sub="Data sharing and security settings"
            onPress={() => navigation.navigate('PrivacySecurity')}
            right={<MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />}
          />
          <SettingRow
            icon="lock-reset"
            label="Change Password"
            onPress={() => navigation.navigate('ForgotPassword', { fromSettings: true })}
            right={<MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />}
          />
        </Section>

        {/* ── Data ────────────────────────────────────────────────────── */}
        <Section title="DATA">
          <SettingRow
            icon="delete-sweep-outline"
            label="Clear All Local Data"
            sub="Remove collection cache and history"
            onPress={handleClearData}
            danger
            right={<MaterialCommunityIcons name="chevron-right" size={18} color={colors.error} />}
          />
        </Section>

        {/* ── Danger Zone ─────────────────────────────────────────────── */}
        <Section title="DANGER ZONE">
          <SettingRow
            icon="account-remove-outline"
            label="Delete Account"
            sub="Permanently delete your account and all data (GDPR)"
            onPress={handleDeleteAccount}
            danger
            right={<MaterialCommunityIcons name="chevron-right" size={18} color={colors.error} />}
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
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

  section:     { paddingHorizontal: spacing.edge, marginTop: spacing.lg },
  sectionTitle:{ fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.sm },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  rowDanger: { backgroundColor: 'rgba(255,180,171,0.05)' },
  rowIcon: {
    width: 38, height: 38, borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(242,202,80,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: 'rgba(255,180,171,0.12)' },
  rowText:  { flex: 1 },
  rowLabel: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.text },
  rowSub:   { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 1 },

  nameInput: {
    flex: 1,
    fontFamily: fonts.sansMedium, fontSize: 15, color: colors.text,
    borderBottomWidth: 1.5, borderBottomColor: colors.primary,
    paddingVertical: 4,
  },
  nameSaveBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

});
