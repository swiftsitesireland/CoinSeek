import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { signIn } from '../../services/authService';
import { signInWithGoogle } from '../../services/googleAuthService';
import { colors, spacing, borderRadius, fonts } from '../../theme';
import Toast from 'react-native-toast-message';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyError(msg) {
  if (msg.includes('Too many requests') || msg.includes('429')) {
    return 'Too many attempts — please wait 15 minutes and try again';
  }
  if (msg.includes('network') || msg.includes('fetch')) return 'Network error — check your connection';
  return 'Invalid email or password';
}

function NHInput({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, rightElement }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={iS.group}>
      {label && <Text style={iS.label}>{label}</Text>}
      <View style={[iS.wrap, focused && iS.wrapFocused]}>
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.textMuted}
            style={iS.icon}
          />
        )}
        <TextInput
          style={iS.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize || 'none'}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightElement}
      </View>
    </View>
  );
}

const iS = StyleSheet.create({
  group:       { gap: 6 },
  label:       { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textVariant },
  wrap:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.inputBorder },
  wrapFocused: { borderColor: colors.primary },
  icon:        { paddingLeft: 14 },
  input:       { flex: 1, fontFamily: fonts.sans, color: colors.text, fontSize: 15, paddingVertical: 16, paddingHorizontal: 12 },
});

export default function LoginScreen({ navigation }) {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [cooldown,      setCooldown]      = useState(0);
  const [failCount,     setFailCount]     = useState(0);
  const cooldownRef = React.useRef(null);

  React.useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function startCooldown(seconds) {
    setCooldown(seconds);
    cooldownRef.current = setInterval(() => {
      setCooldown(s => {
        if (s <= 1) { clearInterval(cooldownRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function handleGoogleSignIn() {
    if (googleLoading || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoogleLoading(true);
    try {
      const { success } = await signInWithGoogle();
      if (!success) return; // user cancelled — do nothing
      // AuthContext onAuthStateChange will navigate automatically
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Google sign-in failed', text2: 'Please try again or use email instead' });
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLogin() {
    if (cooldown > 0 || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!email.trim() || !password) {
      Toast.show({ type: 'error', text1: 'Missing fields', text2: 'Please enter your email and password' });
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      Toast.show({ type: 'error', text1: 'Invalid email', text2: 'Please enter a valid email address' });
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      setFailCount(0);
    } catch (e) {
      const next = failCount + 1;
      setFailCount(next);
      const wait = Math.min(2 ** next, 30);
      startCooldown(wait);
      Toast.show({ type: 'error', text1: 'Login failed', text2: friendlyError(e.message) });
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
        {/* Brand */}
        <View style={styles.brandArea}>
          <Text style={styles.brandName}>COINSEEK</Text>
          <Text style={styles.headline}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to access your digital vault</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <NHInput
            label="Email Address"
            icon="email-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="collector@vault.com"
            keyboardType="email-address"
          />

          <NHInput
            label="Password"
            icon="lock-outline"
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

          <TouchableOpacity style={styles.forgotWrap} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading || cooldown > 0}
            activeOpacity={0.88}
            style={[styles.primaryBtnOuter, (loading || cooldown > 0) && { opacity: 0.6 }]}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              {loading
                ? <ActivityIndicator color={colors.onPrimary} size="small" />
                : cooldown > 0
                  ? <Text style={styles.primaryBtnText}>WAIT {cooldown}s</Text>
                  : (
                    <View style={styles.btnInner}>
                      <Text style={styles.primaryBtnText}>SIGN IN</Text>
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
          <Text style={styles.footerText}>New to CoinSeek? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40 },

  brandArea: { alignItems: 'center', marginBottom: 40 },
  brandName: {
    fontFamily: fonts.serif,
    fontSize: 40,
    color: colors.primary,
    letterSpacing: 4,
    marginBottom: 16,
  },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 28,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },

  form: { gap: spacing.md },

  eyeBtn: { paddingHorizontal: 14, paddingVertical: spacing.sm },

  forgotWrap: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.primary },

  primaryBtnOuter: { borderRadius: borderRadius.full, overflow: 'hidden', marginTop: spacing.xs },
  primaryBtn:      { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  btnInner:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primaryBtnText:  { fontFamily: fonts.sansBold, fontSize: 15, color: colors.onPrimary, letterSpacing: 1 },

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

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted },
  footerLink: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.primary },
});
