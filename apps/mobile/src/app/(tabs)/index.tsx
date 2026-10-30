import { displayStreak, toDay } from '@zabanz/shared';
import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Loading, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getProfile } from '@/db/profile';
import { attemptsLite, dueWordCards, mistakeIds } from '@/db/repo';
import { useFocusData } from '@/hooks/use-focus-data';
import { fa, pct } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

export default function Home() {
  const theme = useTheme();
  const [data] = useFocusData(async (db) => {
    const today = toDay();
    const [profile, due, mistakes, todays] = await Promise.all([getProfile(db), dueWordCards(db, today), mistakeIds(db), attemptsLite(db, today)]);
    return { profile, due: due.length, mistakes: mistakes.length, todays, today };
  });
  if (!data) return <Loading />;
  if (!data.profile.onboarded) return <Redirect href="/onboarding" />;

  const { profile, today, todays } = data;
  const streak = displayStreak(profile.streak, today);
  const doneToday = profile.streak.lastDay === today;
  const correct = todays.filter((a) => a.correct).length;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <ThemedText type="title">زبانز</ThemedText>
          <ThemedText themeColor="textSecondary">سطح فعلی: {profile.level}</ThemedText>
        </View>
        <View style={[styles.chip, { backgroundColor: theme.accentSoft }]} accessibilityLabel={`استریک ${streak} روز`}>
          <ThemedText type="smallBold" themeColor="accent">🔥 {fa(streak)}</ThemedText>
        </View>
        <View style={[styles.chip, { backgroundColor: theme.brandSoft }]} accessibilityLabel={`${profile.xp} امتیاز`}>
          <ThemedText type="smallBold" themeColor="brand">⭐ {fa(profile.xp)}</ThemedText>
        </View>
      </View>

      <Card tone="brandSoft" style={{ padding: Spacing.four, gap: Spacing.three }}>
        <ThemedText type="heading">{doneToday ? 'درس امروز انجام شد ✓' : 'درس امروز'}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {doneToday ? 'عالی بود! اگر وقت داری یک درس دیگر هم بزن.' : '۱۰ سؤال متناسب با سطح و نقاط ضعفت، حدود ۵ دقیقه.'}
        </ThemedText>
        <Button title={doneToday ? 'یک درس دیگر' : 'شروع درس امروز'} onPress={() => router.push({ pathname: '/session', params: { mode: 'daily' } })} />
      </Card>

      <View style={styles.grid}>
        <Card style={{ flex: 1 }}>
          <ThemedText type="number" themeColor="brand">{fa(data.due)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">کارت لایتنر برای امروز</ThemedText>
          <Button variant="secondary" title="مرور لغات" onPress={() => router.push('/review')} />
        </Card>
        <Card style={{ flex: 1 }}>
          <ThemedText type="number" themeColor="accent">{fa(data.mistakes)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">سؤال در دفتر اشتباهات</ThemedText>
          <Button
            variant="secondary"
            title="مرور اشتباهات"
            disabled={!data.mistakes}
            onPress={() => router.push({ pathname: '/session', params: { mode: 'mistakes' } })}
          />
        </Card>
      </View>

      <Card>
        <ThemedText type="smallBold">امروز</ThemedText>
        <ThemedText themeColor="textSecondary">
          {todays.length ? `${fa(todays.length)} سؤال جواب دادی، ${fa(correct)} تا درست (${pct(correct / todays.length)})` : 'هنوز سؤالی جواب ندادی.'}
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chip: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  grid: { flexDirection: 'row', gap: Spacing.three },
});
