import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { signUp } from '../../services/authService';
import { signInWithGoogle } from '../../services/googleAuthService';
import { colors, spacing, borderRadius, fonts } from '../../theme';
import Toast from 'react-native-toast-message';

// Severe slurs and clear profanity blocked in display names. Mirrors the
// server-side list in supabase/functions/auth-proxy so the user gets instant
// feedback; the server remains the source of truth.
const BANNED_NAME_TOKENS = [
  'fuck', 'shit', 'cunt', 'bitch', 'bastard', 'asshole', 'dick', 'pussy',
  'cock', 'whore', 'slut', 'rape', 'nigger', 'nigga', 'faggot', 'fag',
  'retard', 'spic', 'chink', 'kike', 'wetback', 'tranny', 'dyke', 'coon',
  'nazi', 'hitler', 'pedo', 'pedophile', 'molest', 'kkk',
];

function isInappropriateName(name) {
  const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
  if (!normalized) return false;
  return BANNED_NAME_TOKENS.some((token) => normalized.includes(token));
}

function friendlyError(msg) {
  if (msg.includes('Too many requests') || msg.includes('429')) {
    return 'Too many attempts — please wait 15 minutes and try again';
  }
  if (msg.includes('already registered') || msg.includes('already exists')) return 'An account with this email already exists. Please log in instead.';
  if (msg.includes('not allowed')) return 'Please choose a different name';
  if (msg.includes('Password') || msg.includes('password')) return 'Password must be at least 8 characters including one letter and one number';
  if (msg.includes('Username') || msg.includes('username')) return msg;
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error — check your connection';
  return 'Sign up failed — please try again';
}

function FloatingInput({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, rightElement }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fS.group}>
      <View style={[fS.wrap, focused && fS.wrapFocused]}>
        <TextInput
          style={fS.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightElement}
      </View>
      {label && (
        <Text style={[fS.label, focused && fS.labelFocused]}>{label}</Text>
      )}
    </View>
  );
}

const fS = StyleSheet.create({
  group:        { marginTop: 10 },
  wrap:         { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.inputBorder },
  wrapFocused:  { borderColor: colors.primary },
  input:        { flex: 1, fontFamily: fonts.sans, color: colors.text, fontSize: 15, paddingVertical: 16, paddingHorizontal: 14 },
  label:        { position: 'absolute', top: -9, left: 12, backgroundColor: colors.background, paddingHorizontal: 4, fontFamily: fonts.sansBold, fontSize: 10, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  labelFocused: { color: colors.primary },
});

export default function SignupScreen({ navigation }) {
  const [fullName,      setFullName]      = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    if (googleLoading || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    try {
      const { success } = await signInWithGoogle();
      if (!success) return; // user cancelled
      // AuthContext onAuthStateChange + AppNavigator handle the rest
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Google sign-in failed', text2: 'Please try again or create an account with email' });
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSignup() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!fullName.trim() || !email.trim() || !password) {
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Please fill in all fields' });
      return;
    }
    if (isInappropriateName(fullName)) {
      Toast.show({ type: 'error', text1: 'Invalid name', text2: 'Please choose a different name' });
      return;
    }
    if (!agreedToTerms) {
      Toast.show({ type: 'error', text1: 'Terms required', text2: 'Please agree to the Terms of Service' });
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      Toast.show({ type: 'error', text1: 'Weak password', text2: 'Use 8+ characters including at least one letter and one number' });
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim());
      await SecureStore.setItemAsync('coinseek_needs_plan_selection', 'true');
      Toast.show({ type: 'success', text1: 'Account created!', text2: 'Check your email to confirm your account' });
      navigation.navigate('Login');
    } catch (e) {
      const msg = friendlyError(e.message);
      const isEmailTaken = msg.includes('already exists');
      Toast.show({
        type: 'error',
        text1: isEmailTaken ? 'Email already in use' : 'Sign up failed',
        text2: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <MaterialCommunityIcons name="bank-outline" size={20} color={colors.primary} />
            <Text style={styles.logoText}>COINSEEK</Text>
          </View>
          <Text style={styles.headline}>Begin Your Collection</Text>
          <Text style={styles.subtitle}>Identify and catalog your coins</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <FloatingInput
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Julian Sterling"
            autoCapitalize="words"
          />

          <FloatingInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
          />

          <FloatingInput
            label="Create Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            rightElement={
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            }
          />

          {/* Terms checkbox */}
          <TouchableOpacity style={styles.termsRow} onPress={() => setAgreedToTerms(v => !v)} activeOpacity={0.8}>
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <MaterialCommunityIcons name="check" size={12} color={colors.onPrimary} />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => navigation.navigate('TermsOfService')}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => navigation.navigate('PrivacyPolicy')}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.88}
            style={[styles.primaryBtnOuter, loading && { opacity: 0.6 }]}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              {loading
                ? <ActivityIndicator color={colors.onPrimary} size="small" />
                : (
                  <View style={styles.btnInner}>
                    <Text style={styles.primaryBtnText}>Create Account</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color={colors.onPrimary} />
                  </View>
                )
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google sign-in */}
        <TouchableOpacity
          style={[styles.oauthBtn, (googleLoading || loading) && { opacity: 0.6 }]}
          onPress={handleGoogleSignIn}
          disabled={googleLoading || loading}
          activeOpacity={0.85}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <>
              <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
              <Text style={styles.oauthText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 },

  header:   { alignItems: 'center', marginBottom: 32 },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  logoText: { fontFamily: fonts.serif, fontSize: 16, color: colors.primary, letterSpacing: 3 },
  headline: { fontFamily: fonts.serif, fontSize: 32, color: colors.text, textAlign: 'center', marginBottom: 8, lineHeight: 38 },
  subtitle: { fontFamily: fonts.sans, fontSize: 15, color: colors.textMuted, textAlign: 'center' },

  form: { gap: spacing.md },

  eyeBtn: { paddingHorizontal: 14, paddingVertical: spacing.sm },

  termsRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 4 },
  checkbox:        { width: 18, height: 18, borderRadius: 3, borderWidth: 1.5, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText:       { flex: 1, fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  termsLink:       { color: colors.primary, fontFamily: fonts.sansMedium },

  primaryBtnOuter: { borderRadius: borderRadius.full, overflow: 'hidden', marginTop: spacing.xs },
  primaryBtn:      { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  btnInner:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primaryBtnText:  { fontFamily: fonts.sansBold, fontSize: 16, color: colors.onPrimary },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outlineVariant },
  dividerText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 },

  oauthRow: { flexDirection: 'row', gap: spacing.sm },
  oauthBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingVertical: 14,
  },
  oauthText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.text },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl, marginBottom: spacing.sm },
  footerText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted },
  footerLink: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.primary },
});
