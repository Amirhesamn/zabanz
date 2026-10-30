import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, ProgressBar, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { saveProfile, type TargetExam } from '@/db/profile';
import { useTheme } from '@/hooks/use-theme';
import { fa } from '@/lib/format';

const GOALS: { id: TargetExam; label: string }[] = [
  { id: 'konkur', label: 'کنکور' },
  { id: 'msrt', label: 'MSRT / EPT' },
  { id: 'ielts', label: 'آیلتس / تافل' },
  { id: 'general', label: 'زبان عمومی' },
];
const MINUTES = [5, 10, 20];

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, { backgroundColor: selected ? theme.brandSoft : theme.surface, borderColor: selected ? theme.brand : theme.line }]}>
      <ThemedText type="smallBold" style={{ fontSize: 16 }} themeColor={selected ? 'brand' : 'text'}>{label}</ThemedText>
    </Pressable>
  );
}

export default function Onboarding() {
  const db = useSQLiteContext();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<TargetExam>();
  const [minutes, setMinutes] = useState<number>();

  async function finish(level: 'A2' | 'B1' | 'placement') {
    await saveProfile(db, { onboarded: true, targetExam: goal ?? 'general', dailyMinutes: minutes ?? 10, level: level === 'B1' ? 'B1' : 'A2' });
    if (level === 'placement') router.replace({ pathname: '/session', params: { mode: 'placement' } });
    else router.replace('/');
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <ProgressBar value={(step + 1) / 3} />
      {step === 0 && (
        <View style={styles.step}>
          <ThemedText type="title">برای چه زبان می‌خوانی؟</ThemedText>
          {GOALS.map((g) => <Choice key={g.id} label={g.label} selected={goal === g.id} onPress={() => setGoal(g.id)} />)}
          <Button title="ادامه" disabled={!goal} onPress={() => setStep(1)} />
        </View>
      )}
      {step === 1 && (
        <View style={styles.step}>
          <ThemedText type="title">روزی چقدر وقت داری؟</ThemedText>
          {MINUTES.map((m) => <Choice key={m} label={`${fa(m)} دقیقه`} selected={minutes === m} onPress={() => setMinutes(m)} />)}
          <Button title="ادامه" disabled={!minutes} onPress={() => setStep(2)} />
        </View>
      )}
      {step === 2 && (
        <View style={styles.step}>
          <ThemedText type="title">از کجا شروع کنیم؟</ThemedText>
          <ThemedText themeColor="textSecondary">با یک آزمون کوتاه ۱۲ سؤالی سطحت را پیدا می‌کنیم. اگر سطحت را می‌دانی، می‌توانی مستقیم انتخابش کنی.</ThemedText>
          <Button title="آزمون تعیین سطح" subtitle="حدود ۳ دقیقه" onPress={() => finish('placement')} />
          <Button variant="secondary" title="مقدماتی (A2)" onPress={() => finish('A2')} />
          <Button variant="secondary" title="متوسط (B1)" onPress={() => finish('B1')} />
        </View>
      )}
      {step > 0 && <Button variant="ghost" title="قبلی" onPress={() => setStep(step - 1)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { gap: Spacing.three },
  choice: { minHeight: 56, borderRadius: Radius.md, borderWidth: 1.5, paddingHorizontal: Spacing.three, justifyContent: 'center' },
});
