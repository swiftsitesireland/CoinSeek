import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { resetPassword } from '../../services/authService';
import { colors, spacing, borderRadius, fonts, typography } from '../../theme';
import Toast from 'react-native-toast-message';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation }) {
  const [email,   setEmail]   = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  function friendlyError(msg) {
    if (msg.includes('Too many requests') || msg.includes('429')) {
      return 'Too many attempts — please wait 15 minutes and try again';
    }
    if (msg.includes('network') || msg.includes('fetch')) return 'Network error — check your connection';
    // Always show success regardless — never reveal if email exists
    return null;
  }

  async function handleReset() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Enter your email' });
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      Toast.show({ type: 'error', text1: 'Invalid email', text2: 'Please enter a valid email address' });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true); // Always show success — don't reveal if email is registered
    } catch (e) {
      const msg = friendlyError(e.message);
      if (msg) {
        Toast.show({ type: 'error', text1: 'Failed', text2: msg });
      } else {
        setSent(true); // Hide errors that would reveal email existence
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name={sent ? 'email-check-outline' : 'lock-reset'}
            size={36}
            color={colors.primary}
          />
        </View>

        <Text style={styles.title}>{sent ? 'Email Sent!' : 'Reset Password'}</Text>
        <Text style={styles.subtitle}>
          {sent
            ? `Check your inbox at ${email} for a password reset link.`
            : "Enter your email and we'll send you a reset link."}
        </Text>

        {!sent && (
          <>
            <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
              <MaterialCommunityIcons name="email-outline" size={18} color={focused ? colors.primary : colors.textMuted} style={{ paddingLeft: spacing.md }} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtnOuter, loading && { opacity: 0.6 }]}
              onPress={handleReset}
              disabled={loading}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                {loading
                  ? <ActivityIndicator color={colors.onPrimary} />
                  : <Text style={styles.primaryBtnText}>Send Reset Link</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {sent && (
          <TouchableOpacity
            style={styles.primaryBtnOuter}
            onPress={() => navigation.navigate('Login')}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Back to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  backBtn: {
    position: 'absolute', top: 56, left: spacing.edge, zIndex: 10,
    width: 42, height: 42, borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1, borderColor: colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
  },

  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: spacing.xl, gap: spacing.lg,
  },

  iconWrap: {
    width: 80, height: 80, borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1, borderColor: colors.outlineVariant,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  title:    { ...typography.headlineMd, textAlign: 'center' },
  subtitle: { fontFamily: fonts.sans, fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.inputBorder,
    width: '100%',
  },
  inputWrapFocused: { borderColor: colors.primary },
  input: {
    flex: 1, fontFamily: fonts.sans, color: colors.text,
    fontSize: 15, paddingVertical: 14, paddingHorizontal: 12,
  },

  primaryBtnOuter: { borderRadius: borderRadius.md, overflow: 'hidden', width: '100%' },
  primaryBtn:      { paddingVertical: 16, alignItems: 'center' },
  primaryBtnText:  { fontFamily: fonts.sansBold, fontSize: 15, color: colors.onPrimary, letterSpacing: 0.5 },
});
