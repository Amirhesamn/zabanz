import { BOX_INTERVAL_DAYS, LEARNED } from '@zabanz/shared';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Loading, Screen } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getProfile } from '@/db/profile';
import { addNewWords, boxCounts, dueWordCards, wordsNotInBox } from '@/db/repo';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { fa } from '@/lib/format';

const intervalFa = (d: number) => (d === 1 ? 'هر روز' : `هر ${fa(d)} روز`);

export default function Words() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [data, reload] = useFocusData(async (db) => {
    const [counts, due, remaining, profile] = await Promise.all([boxCounts(db), dueWordCards(db), wordsNotInBox(db), getProfile(db)]);
    return { byBox: new Map(counts.map((c) => [c.box, c.n])), due: due.length, remaining, perDay: profile.newWordsPerDay };
  });
  if (!data) return <Loading />;

  async function addAndReview() {
    await addNewWords(db);
    reload();
    router.push('/review');
  }

  return (
    <Screen>
      <ThemedText type="title">جعبهٔ لایتنر</ThemedText>
      <ThemedText themeColor="textSecondary">
        هر لغت از خانهٔ ۱ شروع می‌کند. اگر یادت بود یک خانه جلو می‌رود و اگر یادت نبود به خانهٔ ۱ برمی‌گردد. بعد از خانهٔ ۵ آموخته‌شده حساب می‌شود.
      </ThemedText>

      <View style={styles.boxes}>
        {BOX_INTERVAL_DAYS.map((d, i) => (
          <View key={i} style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.line }]} accessibilityLabel={`خانهٔ ${i + 1}: ${data.byBox.get(i + 1) ?? 0} کارت`}>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>خانهٔ {fa(i + 1)}</ThemedText>
            <ThemedText type="number" themeColor="brand" style={{ textAlign: 'center' }}>{fa(data.byBox.get(i + 1) ?? 0)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', fontSize: 12 }}>{intervalFa(d)}</ThemedText>
          </View>
        ))}
        <View style={[styles.box, { backgroundColor: theme.brand, borderColor: theme.brand }]} accessibilityLabel={`آموخته‌شده: ${data.byBox.get(LEARNED) ?? 0}`}>
          <ThemedText type="small" style={{ color: theme.onBrand, textAlign: 'center' }}>آموخته</ThemedText>
          <ThemedText type="number" style={{ color: theme.onBrand, textAlign: 'center' }}>{fa(data.byBox.get(LEARNED) ?? 0)}</ThemedText>
          <ThemedText type="small" style={{ color: theme.onBrand, textAlign: 'center', fontSize: 12 }}>✓</ThemedText>
        </View>
      </View>

      <Card tone="brandSoft" style={{ gap: Spacing.three }}>
        <ThemedText type="heading">{data.due ? `${fa(data.due)} کارت منتظر توست` : 'امروز کارت موعددار نداری'}</ThemedText>
        {data.due > 0 && <Button title="شروع مرور" onPress={() => router.push('/review')} />}
        {data.remaining > 0 && (
          <Button
            variant={data.due ? 'secondary' : 'primary'}
            title="افزودن لغات جدید امروز"
            subtitle={`تا ${fa(data.perDay)} لغت در روز · ${fa(data.remaining)} لغت باقی مانده`}
            onPress={addAndReview}
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  box: { flexBasis: '30%', flexGrow: 1, borderWidth: 1, borderRadius: Radius.md, paddingVertical: Spacing.two },
});
