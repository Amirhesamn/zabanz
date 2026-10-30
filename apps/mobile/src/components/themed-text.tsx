import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'heading' | 'small' | 'smallBold' | 'latin' | 'number';
  themeColor?: ThemeColor;
};

// RN leaves textAlign unset as physical-left even in RTL; 'left' means "start", so set it everywhere.
// `latin` is English question text: forced LTR regardless of the RTL app layout.
export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles.base, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  base: { fontFamily: Fonts.sans, textAlign: 'left' },
  default: { fontSize: 16, lineHeight: 28 },
  small: { fontSize: 14, lineHeight: 24 },
  smallBold: { fontSize: 14, lineHeight: 24, fontWeight: 700 },
  heading: { fontSize: 20, lineHeight: 32, fontWeight: 700 },
  title: { fontSize: 28, lineHeight: 42, fontWeight: 800 },
  latin: { fontSize: 18, lineHeight: 28, fontWeight: 500, writingDirection: 'ltr' },
  number: { fontSize: 28, lineHeight: 36, fontWeight: 800 },
});
