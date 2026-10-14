/**
 * Ovovita Design System Tokens
 * Extracted from DESIGN.md (Warm Modern Organic / Tactile Farm-to-Table)
 */

export const OvovitaColors = {
  // Brand Primary & Accents
  primary: '#D97706', // Rich Yolk Amber
  primaryDark: '#8D4B00',
  primaryContainer: '#B15F00',
  primaryFixed: '#FFDCC3',
  primaryFixedDim: '#FFB77D',
  onPrimary: '#FFFFFF',

  // Secondary (Freshness & Organic Certification)
  secondary: '#059669', // Pasture Mint
  secondaryDark: '#006C4A',
  secondaryContainer: '#82F5C1',
  secondaryFixed: '#85F8C4',
  onSecondary: '#FFFFFF',

  // Tertiary (Alerts & Critical Stock)
  tertiary: '#DC2626', // Hen Comb Crimson
  tertiaryContainer: '#E02928',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onTertiary: '#FFFFFF',

  // Warm Porcelain & Slate Neutral Palette
  surface: '#F9F9FF',
  surfaceGround: '#FFFDF7', // Warm porcelain off-white
  surfaceCard: '#FBF8F1', // Sun-dried parchment
  surfaceSubdued: '#F3EEDF', // Eggshell cream border
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F0F3FF',
  surfaceContainer: '#E7EEFF',
  surfaceContainerHigh: '#DEE8FF',
  surfaceContainerHighest: '#D8E3FB',

  // Text Slate Colors
  textPrimary: '#0F172A', // Charcoal slate
  textSecondary: '#475569', // Muted loam
  onSurface: '#111C2D',
  onSurfaceVariant: '#554336',
  outline: '#887364',
  outlineVariant: '#DBC2B0',
} as const;

export const OvovitaBorderRadii = {
  sm: '0.25rem', // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.5rem', // 24px (Soft squircle for cards)
  full: '9999px', // Pill for steppers & badges
} as const;

export const OvovitaShadows = {
  subtle: '0 1px 4px rgba(0, 0, 0, 0.04)',
  card: '0 4px 12px -2px rgba(217, 119, 6, 0.05), 0 2px 4px -1px rgba(30, 41, 59, 0.03)',
  modal: '0 8px 24px -4px rgba(217, 119, 6, 0.08), 0 2px 6px -1px rgba(30, 41, 59, 0.04)',
  amberGlow: '0 0 16px rgba(217, 119, 6, 0.25)',
} as const;

export const OvovitaTailwindPreset = {
  theme: {
    extend: {
      colors: {
        primary: OvovitaColors.primary,
        'primary-dark': OvovitaColors.primaryDark,
        'primary-container': OvovitaColors.primaryContainer,
        'primary-fixed': OvovitaColors.primaryFixed,
        secondary: OvovitaColors.secondary,
        'secondary-container': OvovitaColors.secondaryContainer,
        'secondary-fixed': OvovitaColors.secondaryFixed,
        tertiary: OvovitaColors.tertiary,
        'tertiary-container': OvovitaColors.tertiaryContainer,
        surface: OvovitaColors.surface,
        'surface-ground': OvovitaColors.surfaceGround,
        'surface-card': OvovitaColors.surfaceCard,
        'surface-subdued': OvovitaColors.surfaceSubdued,
        'surface-container-low': OvovitaColors.surfaceContainerLow,
        'surface-container': OvovitaColors.surfaceContainer,
        'surface-container-high': OvovitaColors.surfaceContainerHigh,
        'surface-container-highest': OvovitaColors.surfaceContainerHighest,
        'surface-container-lowest': OvovitaColors.surfaceContainerLowest,
        'on-surface': OvovitaColors.onSurface,
        'on-surface-variant': OvovitaColors.onSurfaceVariant,
        outline: OvovitaColors.outline,
        'outline-variant': OvovitaColors.outlineVariant,
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: OvovitaBorderRadii,
      boxShadow: OvovitaShadows,
    },
  },
};
