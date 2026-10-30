// Palette from GDD.html: warm paper background, teal brand, orange accent.
export const Colors = {
  light: {
    background: '#f7f5f0',
    surface: '#ffffff',
    surface2: '#f0ede6',
    text: '#1d1b18',
    textSecondary: '#6b665d',
    line: '#e3ded3',
    brand: '#0f766e',
    brandSoft: '#d5efe9',
    onBrand: '#ffffff',
    accent: '#c2410c',
    accentSoft: '#fbe6d7',
    ok: '#15803d',
    okSoft: '#dcf3e3',
    bad: '#b91c1c',
    badSoft: '#fbe2e2',
  },
  dark: {
    background: '#121412',
    surface: '#1b1e1c',
    surface2: '#232725',
    text: '#ece9e2',
    textSecondary: '#a19c92',
    line: '#2f3431',
    brand: '#2dd4bf',
    brandSoft: '#123b36',
    onBrand: '#0b1f1c',
    accent: '#f59e5b',
    accentSoft: '#3a2516',
    ok: '#4ade80',
    okSoft: '#13301d',
    bad: '#f87171',
    badSoft: '#3a1717',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

// shortcut: one variable TTF, so Android synthesises bold; ship static weights if headings look off.
export const Fonts = { sans: 'Vazirmatn' } as const;

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const Radius = { sm: 10, md: 14, lg: 20, pill: 999 } as const;

export const MaxContentWidth = 640;
