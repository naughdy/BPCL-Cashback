// Simple, high-contrast theme tuned for an operator using this at a busy
// fuel pump — large touch targets, minimal decoration (PART 39).
export const colors = {
  bpclBlue: '#003C71', // BPCL brand-inspired deep blue
  bpclOrange: '#F58220', // BPCL brand-inspired orange accent
  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E2E5EA',
  textPrimary: '#161B22',
  textSecondary: '#5B6472',
  success: '#1D8A4C',
  successBg: '#E6F6EC',
  danger: '#C13B3B',
  dangerBg: '#FBEAEA',
  warning: '#B36B00',
  warningBg: '#FFF3E0',
  disabled: '#C7CCD3',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  button: { fontSize: 17, fontWeight: '700' as const },
};

// Minimum touch target height for operator-facing controls.
export const MIN_TOUCH_TARGET = 56;
