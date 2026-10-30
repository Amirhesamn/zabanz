import { accuracyBy, addDays, displayStreak, features, isPlus, MIN_ATTEMPTS_FOR_VERDICT, toDay, weakTopics, type Cefr } from '@zabanz/shared';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, Loading, ProgressBar, Row, Screen, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { freezesAvailable, getProfile, saveProfile } from '@/db/profile';
import { attemptsLite } from '@/db/repo';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { fa, pct, SKILL_FA, topicFa } from '@/lib/format';
import { ads } from '@/services/ads';

export default function Me() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [data, reload] = useFocusData(async (db) => {
    const today = toDay();
    const [profile, all, week] = await Promise.all([getProfile(db), attemptsLite(db), attemptsLite(db, addDays(today, -6))]);
    return { profile, all, week, today };
  });
  if (!data) return <Loading />;

  const { profile, all, week, today } = data;
  const plus = isPlus(profile.entitlement);
  const f = features(plus);
  const bySkill = accuracyBy(all, 'skill');
  const weak = weakTopics(all);
  const topicAcc = accuracyBy(all, 'topic');
  const freezes = freezesAvailable(profile, today);
  const weekCorrect = week.filter((a) => a.correct).length;

  async function earnFreeze() {
    if (!(await ads.showRewarded())) return;
    await saveProfile(db, { bonusFreezes: (await getProfile(db)).bonusFreezes + 1 });
    reload();
  }

  async function setLevel(level: Cefr) {
    await saveProfile(db, { level });
    reload();
  }

  return (
    <Screen>
      <ThemedText type="title">من</ThemedText>

      <View style={{ flexDirection: 'row', gap: Spacing.three }}>
        <Card style={{ flex: 1 }}>
          <ThemedText type="number" themeColor="accent">🔥{fa(displayStreak(profile.streak, today))}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">روز پیاپی</ThemedText>
        </Card>
        <Card style={{ flex: 1 }}>
          <ThemedText type="number" themeColor="brand">{fa(profile.xp)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">امتیاز کل</ThemedText>
        </Card>
        <Card style={{ flex: 1 }}>
          <ThemedText type="number" themeColor="brand">{plus ? '∞' : fa(freezes)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">یخ‌زدن استریک</ThemedText>
        </Card>
      </View>
      {!plus && <Button variant="secondary" title="❄️ یک یخ‌زدن بگیر" subtitle="با تماشای یک تبلیغ کوتاه" onPress={earnFreeze} />}

      <Section title="این هفته">
        <Card>
          <ThemedText>
            {week.length ? `${fa(week.length)} سؤال در ۷ روز اخیر، ${pct(weekCorrect / week.length)} درست` : 'در ۷ روز اخیر سؤالی جواب ندادی.'}
          </ThemedText>
        </Card>
      </Section>

      <Section title="دقت به تفکیک مهارت">
        <Card style={{ gap: Spacing.three }}>
          {(['grammar', 'vocab', 'reading'] as const).map((s) => {
            const a = bySkill[s];
            return (
              <View key={s} style={{ gap: Spacing.one }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <ThemedText type="smallBold">{SKILL_FA[s]}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{a ? `${pct(a.rate)} · از ${fa(a.total)} پاسخ` : 'هنوز پاسخی نیست'}</ThemedText>
                </View>
                <ProgressBar value={a?.rate ?? 0} color={a && a.rate < 0.6 ? theme.accent : theme.brand} />
              </View>
            );
          })}
        </Card>
      </Section>

      <Section title="نقشهٔ ضعف">
        {weak.length === 0 ? (
          <Card>
            <ThemedText themeColor="textSecondary">
              فعلاً مبحث ضعیفی پیدا نشد. برای هر مبحث حداقل {fa(MIN_ATTEMPTS_FOR_VERDICT)} پاسخ لازم است تا قضاوت کنیم.
            </ThemedText>
          </Card>
        ) : (
          <>
            {(f.weaknessMap ? weak : weak.slice(0, 1)).map((t) => (
              <Row key={t} title={topicFa(t)} detail={`دقت ${pct(topicAcc[t]!.rate)} از ${fa(topicAcc[t]!.total)} پاسخ`} right="تمرین"
                onPress={() => router.push({ pathname: '/session', params: { mode: 'daily' } })} />
            ))}
            {!f.weaknessMap && weak.length > 1 && (
              <Card tone="surface2">
                <ThemedText type="small">{fa(weak.length - 1)} مبحث ضعیف دیگر هم داری. نقشهٔ کامل ضعف در زبانز پلاس.</ThemedText>
              </Card>
            )}
          </>
        )}
      </Section>

      <Section title="سطح">
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          {(['A2', 'B1'] as const).map((l) => (
            <Button key={l} style={{ flex: 1 }} variant={profile.level === l ? 'primary' : 'secondary'} title={l === 'A2' ? 'مقدماتی (A2)' : 'متوسط (B1)'} onPress={() => setLevel(l)} />
          ))}
        </View>
      </Section>

      <Card tone="accentSoft">
        <ThemedText type="heading">زبانز پلاس {plus ? '✓' : ''}</ThemedText>
        <ThemedText type="small">بدون تبلیغ · آمار و نقشهٔ ضعف کامل · آزمون شبیه‌ساز نامحدود · همهٔ بسته‌های آفلاین · توضیح هوش مصنوعی · یخ‌زدن نامحدود</ThemedText>
        <Button title={plus ? 'اشتراک فعال است' : 'به‌زودی'} disabled />
      </Card>
    </Screen>
  );
}
