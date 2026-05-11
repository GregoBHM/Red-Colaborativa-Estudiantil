// Paleta institucional UPT Tacna
// Azul eléctrico oscuro + Blanco + Naranja
export const COLORS = {
  primary: '#0A3D6B',
  primaryLight: '#145A9E',
  primaryDark: '#072B4D',
  primarySoft: 'rgba(10, 61, 107, 0.08)',
  primaryGlow: 'rgba(10, 61, 107, 0.18)',

  accent: '#E8721C',
  accentLight: '#F59642',
  accentDark: '#C45D10',
  accentSoft: 'rgba(232, 114, 28, 0.10)',

  secondary: '#1976D2',
  secondarySoft: 'rgba(25, 118, 210, 0.10)',

  background: '#F0F2F5',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  cardBg: '#FAFBFC',

  textPrimary: '#1B2838',
  textSecondary: '#5A6A7E',
  textLight: '#FFFFFF',
  textMuted: '#8E99A8',

  success: '#2E9E5A',
  successSoft: 'rgba(46, 158, 90, 0.10)',
  error: '#D03E3E',
  errorSoft: 'rgba(208, 62, 62, 0.10)',
  warning: '#E8A817',
  warningSoft: 'rgba(232, 168, 23, 0.10)',
  info: '#2C82C9',

  border: '#DDE1E7',
  borderLight: '#EBEEF2',
  divider: '#D4DAE2',

  overlay: 'rgba(7, 43, 77, 0.55)',
  tabBarBg: '#FFFFFF',

  // Chat — Derived from institutional palette
  chatBg: '#ECE9E2',
  msgMe: '#0A3D6B',
  msgMeLight: '#145A9E',
  msgOther: '#FFFFFF',
  readReceipt: '#E8721C',
  onlineGreen: '#2E9E5A',
};

export const FONTS = {
  regular: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 21,
    xxl: 26,
    hero: 32,
    display: 40,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#0A3D6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  medium: {
    shadowColor: '#0A3D6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  large: {
    shadowColor: '#0A3D6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
};
