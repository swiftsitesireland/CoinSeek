import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, borderRadius } from '../theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    key:     'identify',
    icon:    'line-scan',
    title:   'Identify Any Coin\nInstantly',
    sub:     'Point your camera at any coin and our AI identifies it in seconds — country, year, grade and estimated value.',
    accent:  colors.primary,
  },
  {
    key:     'collection',
    icon:    'layers',
    title:   'Build Your\nCollection',
    sub:     'Every coin you scan is saved to your personal collection with full details, rarity ratings and portfolio value.',
    accent:  colors.primary,
  },
  {
    key:     'value',
    icon:    'chart-line-variant',
    title:   'Track Real\nMarket Value',
    sub:     'See up-to-date market valuations for your coins and watch your collection grow in value over time.',
    accent:  colors.primary,
  },
  {
    key:     'premium',
    icon:    'crown',
    title:   'Start Free.\nGo Premium.',
    sub:     'Enjoy 7 days free with 3 scans per day. Upgrade to Premium for unlimited scans and the full CoinSeek experience.',
    accent:  colors.primary,
    isFinal: true,
  },
];

export default function OnboardingScreen({ navigation }) {
  const insets     = useSafeAreaInsets();
  const flatRef    = useRef(null);
  const scrollX    = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  async function handleGetStarted() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await SecureStore.setItemAsync('coinseek_onboarding_complete', 'true');
    navigation.replace('Login');
  }

  async function handleSignIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await SecureStore.setItemAsync('coinseek_onboarding_complete', 'true');
    navigation.replace('Login');
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (index < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  }

  function handleSkip() {
    flatRef.current?.scrollToIndex({ index: SLIDES.length - 1, animated: true });
  }

  const isLast = index === SLIDES.length - 1;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          style={[styles.skipBtn, { top: insets.top + 12 }]}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={e => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(newIndex);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Icon circle */}
            <LinearGradient
              colors={['rgba(242,202,80,0.15)', 'rgba(212,175,55,0.05)']}
              style={styles.iconOuter}
            >
              <LinearGradient
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconInner}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={item.key === 'premium' ? 42 : 48}
                  color={colors.onPrimary}
                />
              </LinearGradient>
            </LinearGradient>

            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSub}>{item.sub}</Text>
          </View>
        )}
      />

      {/* Bottom area */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.35, 1, 0.35],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity }]}
              />
            );
          })}
        </View>

        {/* CTA */}
        {isLast ? (
          <TouchableOpacity onPress={handleGetStarted} activeOpacity={0.88} style={{ width: '100%' }}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <MaterialCommunityIcons name="rocket-launch-outline" size={20} color={colors.onPrimary} />
              <Text style={styles.primaryBtnText}>Get Started — It's Free</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleNext} activeOpacity={0.88} style={{ width: '100%' }}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.onPrimary} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isLast && (
          <TouchableOpacity
            onPress={handleSignIn}
            activeOpacity={0.7}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>Already have an account? <Text style={{ color: colors.primary }}>Sign in</Text></Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
  },

  skipBtn: {
    position: 'absolute', right: spacing.edge, zIndex: 10,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: borderRadius.full,
  },
  skipText: { fontFamily: fonts.sansMedium, fontSize: 13, color: colors.textMuted },

  // Slides
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.edge * 1.5,
    gap: spacing.lg,
    paddingTop: 80,
  },

  iconOuter: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconInner: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: 'center', justifyContent: 'center',
  },

  slideTitle: {
    fontFamily: fonts.serif,
    fontSize: 36,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 44,
  },
  slideSub: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },

  // Bottom
  bottom: {
    width: '100%',
    paddingHorizontal: spacing.edge,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: {
    height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
  },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 17,
    borderRadius: borderRadius.md, width: '100%',
  },
  primaryBtnText: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.onPrimary },

  loginLink: { paddingVertical: 4 },
  loginLinkText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textMuted },
});
