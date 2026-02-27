/**
 * MediTrack Design System - Color Tokens & Typography
 * Based on the Figma MediTrack Mobile UI Design
 */

export const colors = {
  // Primary Gradient Colors
  teal: '#1FA2A6',
  blue: '#2563EB',

  // Backgrounds
  background: '#F6F9FC',
  surface: '#FFFFFF',

  // Card / elevated surface background
  card: '#FFFFFF',

  // Neutrals
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Status badge backgrounds
  successLight: '#D1FAE5',
  warningLight: '#FEF3C7',
  errorLight: '#FEE2E2',
  pendingLight: '#FEF3C7',
  tealLight: '#CCEDEE',
  blueLight: '#DBEAFE',

  // Specific UI
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.12)',
} as const;

export type ColorScheme = { [K in keyof typeof colors]: string };

/** Dark-mode palette — grays are inverted so gray900 stays "primary text" */
export const darkColors: ColorScheme = {
  // Primary — slightly brighter on dark backgrounds
  teal: '#2BB5B9',
  blue: '#60A5FA',

  // Backgrounds
  background: '#0F172A',
  surface: '#1E293B',

  // Card / elevated surface background
  card: '#1E293B',

  // Neutrals (inverted)
  gray100: '#1E293B',
  gray200: '#334155',
  gray300: '#475569',
  gray400: '#64748B',
  gray500: '#94A3B8',
  gray600: '#CBD5E1',
  gray700: '#E2E8F0',
  gray800: '#F1F5F9',
  gray900: '#F9FAFB',

  // Semantic — brighter variants for dark bg
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',

  // Status badge backgrounds — deeper tones
  successLight: '#064E3B',
  warningLight: '#78350F',
  errorLight: '#7F1D1D',
  pendingLight: '#78350F',
  tealLight: '#134E4A',
  blueLight: '#1E3A5F',

  // Specific UI — white stays white (used for text on gradients)
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export const gradients = {
  primary: ['#1FA2A6', '#2563EB'] as const,
  primaryLight: ['rgba(31,162,166,0.1)', 'rgba(37,99,235,0.1)'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
} as const;

export const typography = {
  h1: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: colors.gray900,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.gray900,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.gray900,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.gray600,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.gray900,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.gray500,
  },
  small: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.gray500,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.gray700,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;
