import { I18nManager, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'heading' | 'small' | 'smallBold' | 'latin' | 'number';
  themeColor?: ThemeColor;
};

// RN swaps textAlign left/right when I18nManager.isRTL (native RTL build), but not when RTL comes only from
// the root `direction` style (Expo Go ignores the forcesRTL plugin). Pick the value that is physically right
// for Persian and physically left for `latin` (English question text) in both cases.
const RIGHT = I18nManager.isRTL ? 'left' : 'right';
const LEFT = I18nManager.isRTL ? 'right' : 'left';
export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles.base, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: { fontFamily: Fonts.sans, textAlign: RIGHT },
  default: { fontSize: 16, lineHeight: 28 },
  small: { fontSize: 14, lineHeight: 24 },
  smallBold: { fontSize: 14, lineHeight: 24, fontWeight: 700 },
  heading: { fontSize: 20, lineHeight: 32, fontWeight: 700 },
  title: { fontSize: 28, lineHeight: 42, fontWeight: 800 },
  latin: { fontSize: 18, lineHeight: 28, fontWeight: 500, writingDirection: 'ltr', textAlign: LEFT },
  number: { fontSize: 28, lineHeight: 36, fontWeight: 800 },
});
