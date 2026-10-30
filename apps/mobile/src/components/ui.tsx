import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ children, scroll = true, edges = ['top'] }: { children: ReactNode; scroll?: boolean; edges?: ('top' | 'bottom')[] }) {
  const theme = useTheme();
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: theme.background }}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{inner}</ScrollView> : <View style={[styles.scroll, { flex: 1 }]}>{inner}</View>}
    </SafeAreaView>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
      <ActivityIndicator color={theme.brand} />
    </View>
  );
}

export function Card({ children, style, tone = 'surface' }: { children: ReactNode; style?: ViewStyle; tone?: 'surface' | 'brandSoft' | 'accentSoft' | 'surface2' }) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme[tone], borderColor: tone === 'surface' ? theme.line : 'transparent' }, style]}>{children}</View>;
}

type ButtonProps = PressableProps & { title: string; variant?: 'primary' | 'secondary' | 'ghost'; subtitle?: string };

export function Button({ title, subtitle, variant = 'primary', style, disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const bg = variant === 'primary' ? theme.brand : variant === 'secondary' ? theme.surface : 'transparent';
  const fg = variant === 'primary' ? theme.onBrand : theme.brand;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(s) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'secondary' ? theme.line : 'transparent', opacity: disabled ? 0.45 : s.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(s) : style,
      ]}
      {...rest}>
      <ThemedText type="smallBold" style={{ color: fg, fontSize: 16, textAlign: 'center' }}>{title}</ThemedText>
      {subtitle ? <ThemedText type="small" style={{ color: fg, opacity: 0.85, textAlign: 'center' }}>{subtitle}</ThemedText> : null}
    </Pressable>
  );
}

/** Tappable list row with a chevron pointing to the reading direction. */
export function Row({ title, detail, onPress, right }: { title: string; detail?: string; onPress: () => void; right?: string }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, { borderColor: theme.line, backgroundColor: pressed ? theme.surface2 : theme.surface }]}>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold" style={{ fontSize: 16 }}>{title}</ThemedText>
        {detail ? <ThemedText type="small" themeColor="textSecondary">{detail}</ThemedText> : null}
      </View>
      {right ? <ThemedText type="smallBold" themeColor="brand">{right}</ThemedText> : null}
      <ThemedText themeColor="textSecondary">‹</ThemedText>
    </Pressable>
  );
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.surface2 }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <View style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%`, height: '100%', backgroundColor: color ?? theme.brand, borderRadius: Radius.pill }} />
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="heading">{title}</ThemedText>
      {children}
    </View>
  );
}

// modals opened via router.replace (onboarding -> placement) have nothing to go back to
export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export function CloseButton() {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="بستن" hitSlop={12} onPress={goBack} style={[styles.close, { backgroundColor: theme.surface2 }]}>
      <ThemedText type="heading" style={{ lineHeight: 26 }}>×</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.six, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  button: { minHeight: 52, borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.md, borderWidth: 1 },
  bar: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  close: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});
