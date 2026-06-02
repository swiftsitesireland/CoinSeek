import { MD3DarkTheme } from 'react-native-paper';

// ─── Numis Heritage Design System ─────────────────────────────────────────────

export const colors = {
  // ── Surfaces ────────────────────────────────────────────────────────────────
  background:           '#131313',
  surface:              '#131313',
  surfaceDim:           '#131313',
  surfaceBright:        '#393939',
  surfaceContainerLow:  '#1c1b1b',
  surfaceContainer:     '#201f1f',
  surfaceContainerHigh: '#2a2a2a',
  surfaceContainerHighest: '#353534',
  surfaceLowest:        '#0e0e0e',

  // ── Text ────────────────────────────────────────────────────────────────────
  text:             '#e5e2e1',
  textVariant:      '#d0c5af',
  textMuted:        '#99907c',
  outline:          '#99907c',
  outlineVariant:   '#4d4635',

  // ── Primary (Metallic Gold) ──────────────────────────────────────────────────
  primary:          '#f2ca50',
  primaryDim:       '#e9c349',
  onPrimary:        '#3c2f00',
  primaryContainer: '#d4af37',

  // ── Gradient ─────────────────────────────────────────────────────────────────
  gradientStart:    '#f2ca50',
  gradientEnd:      '#d4af37',

  // ── Secondary (Silver/Steel) ──────────────────────────────────────────────────
  secondary:        '#c6c6cb',
  onSecondary:      '#2f3034',

  // ── Semantic ─────────────────────────────────────────────────────────────────
  success:          '#4ADE80',
  error:            '#ffb4ab',
  errorContainer:   '#93000a',
  warning:          '#F59E0B',

  // ── Utility ──────────────────────────────────────────────────────────────────
  white:            '#FFFFFF',
  black:            '#000000',
  overlay:          'rgba(0,0,0,0.80)',
  shadow:           '#000000',
  cardBorder:       '#4d4635',
  inputBorder:      '#3A3A3C',
  gold:             '#f2ca50',
};

// ─── Font Families ────────────────────────────────────────────────────────────
export const fonts = {
  serif:        'LibreCaslonText_700Bold',
  serifRegular: 'LibreCaslonText_400Regular',
  sans:         'Manrope_400Regular',
  sansMedium:   'Manrope_500Medium',
  sansSemiBold: 'Manrope_600SemiBold',
  sansBold:     'Manrope_700Bold',
  sansExtraBold:'Manrope_800ExtraBold',
};

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  xs:         4,
  sm:         8,
  md:         16,
  lg:         24,
  xl:         32,
  xxl:        48,
  edge:       20,
  gutter:     12,
};

// ─── Border radii ─────────────────────────────────────────────────────────────
export const borderRadius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  24,
  full: 9999,
};

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 6,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  gold: {
    shadowColor: '#f2ca50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};

// ─── Typography ──────────────────────────────────────────────────────────────
export const typography = {
  displayLg: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.68,
    color: colors.text,
  },
  headlineMd: {
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 32,
    color: colors.text,
  },
  headlineSm: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
  },
  bodyLg: {
    fontFamily: fonts.sans,
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
  },
  bodyMd: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  labelCaps: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  labelMd: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textVariant,
  },
};

// ─── Paper dark theme ────────────────────────────────────────────────────────
export const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary:          colors.primary,
    background:       colors.background,
    surface:          colors.surfaceContainerLow,
    onSurface:        colors.text,
    surfaceVariant:   colors.surfaceContainer,
    onSurfaceVariant: colors.textVariant,
    outline:          colors.cardBorder,
  },
};

// ─── Rarity config ───────────────────────────────────────────────────────────
export const rarityConfig = {
  'common':    { color: '#c6c6cb', label: 'Common',    metalLabel: 'COMMON'    },
  'uncommon':  { color: '#90b4ce', label: 'Uncommon',  metalLabel: 'SILVER'    },
  'rare':      { color: '#f2ca50', label: 'Rare',      metalLabel: 'GOLD'      },
  'very rare': { color: '#d4af37', label: 'Very Rare', metalLabel: 'RARE'      },
  'legendary': { color: '#e5c87a', label: 'Legendary', metalLabel: 'LEGENDARY' },
};
