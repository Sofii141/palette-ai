export const lightColors = {
  // Backgrounds
  bg: '#EFEAE0',
  bgElevated: '#F7F3E9',
  surface: '#FBF8F1',
  surfaceTint: '#E8E1D2',

  // Text
  text: '#1F1E1A',
  textSecondary: '#4A4940',
  textMuted: '#7A7868',
  textInverse: '#FBF8F1',

  // Accents (deep olive / forest)
  accent: '#3D4A2C',
  accentHover: '#4F5E39',
  accentMuted: '#8A9572',
  accentSubtle: 'rgba(61, 74, 44, 0.08)',

  // Decorative
  gold: '#A88A4E',
  goldSoft: '#D4B97A',

  // Borders & overlays
  border: 'rgba(31, 30, 26, 0.10)',
  borderStrong: 'rgba(31, 30, 26, 0.18)',
  overlay: 'rgba(31, 30, 26, 0.45)',
  shadow: 'rgba(61, 74, 44, 0.15)',

  // Status
  heart: '#B8442E',
} as const;

export const darkColors = {
  bg: '#161512',
  bgElevated: '#1F1E1A',
  surface: '#26241F',
  surfaceTint: '#2E2C26',

  text: '#F0EBE0',
  textSecondary: '#C9C3B5',
  textMuted: '#8A8675',
  textInverse: '#1F1E1A',

  accent: '#C9A961',
  accentHover: '#DBBC73',
  accentMuted: '#7A6A3F',
  accentSubtle: 'rgba(201, 169, 97, 0.10)',

  gold: '#D4B97A',
  goldSoft: '#E8D49E',

  border: 'rgba(240, 235, 224, 0.10)',
  borderStrong: 'rgba(240, 235, 224, 0.20)',
  overlay: 'rgba(0, 0, 0, 0.55)',
  shadow: 'rgba(0, 0, 0, 0.40)',

  heart: '#E08470',
} as const;

export type ColorPalette = typeof lightColors;
