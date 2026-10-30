import { LEARNED } from '@zabanz/shared';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, CloseButton, goBack, Loading, ProgressBar, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { dueWordCards, reviewWord, type WordCard } from '@/db/repo';
import { fa } from '@/lib/format';

export default function Review() {
  const db = useSQLiteContext();
  const [cards, setCards] = useState<WordCard[]>();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const [learned, setLearned] = useState(0);

  useEffect(() => {
    dueWordCards(db).then(setCards);
  }, [db]);

  if (!cards) return <Loading />;
  const card = cards[index];

  if (!card)
    return (
      <Screen edges={['top', 'bottom']}>
        <CloseButton />
        <ThemedText type="title">{cards.length ? 'مرور امروز تمام شد ✓' : 'کارت موعدداری نیست'}</ThemedText>
        {cards.length > 0 && (
          <ThemedText themeColor="textSecondary">
            {fa(remembered)} از {fa(cards.length)} لغت یادت بود{learned ? ` و ${fa(learned)} لغت آموخته شد` : ''}. لغت‌هایی که یادت نبود فردا دوباره می‌آیند.
          </ThemedText>
        )}
        <Button title="بازگشت" onPress={goBack} />
      </Screen>
    );

  async function grade(ok: boolean) {
    const next = await reviewWord(db, card!, ok);
    Haptics.impactAsync(ok ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    if (ok) setRemembered((n) => n + 1);
    if (next.box === LEARNED) setLearned((n) => n + 1);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.top}>
        <CloseButton />
        <View style={{ flex: 1 }}>
          <ProgressBar value={index / cards.length} />
        </View>
        <ThemedText type="smallBold" themeColor="textSecondary">{fa(index + 1)} / {fa(cards.length)}</ThemedText>
      </View>

      <Card style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">خانهٔ {fa(card.box)}</ThemedText>
        <View style={styles.ltr}>
          <ThemedText type="latin" style={{ fontSize: 34, lineHeight: 46, fontWeight: 800, textAlign: 'center' }}>{card.lemma}</ThemedText>
          {card.ipa ? <ThemedText type="latin" themeColor="textSecondary" style={{ textAlign: 'center' }}>{card.ipa} · {card.pos}</ThemedText> : null}
          <ThemedText type="latin" style={{ fontSize: 16, textAlign: 'center', marginTop: Spacing.three }}>{card.example}</ThemedText>
        </View>
        {flipped && (
          <View style={{ borderTopWidth: 1, borderColor: 'rgba(127,127,127,0.25)', paddingTop: Spacing.three, marginTop: Spacing.two }} accessibilityLiveRegion="polite">
            <ThemedText type="heading" style={{ textAlign: 'center' }}>{card.meaning_fa}</ThemedText>
          </View>
        )}
      </Card>

      {flipped ? (
        <View style={{ flexDirection: 'row', gap: Spacing.three }}>
          <Button style={{ flex: 1 }} variant="secondary" title="✗ یادم نبود" onPress={() => grade(false)} />
          <Button style={{ flex: 1 }} title="✓ یادم بود" onPress={() => grade(true)} />
        </View>
      ) : (
        <Button title="نمایش معنی" onPress={() => setFlipped(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  card: { minHeight: 280, justifyContent: 'center', padding: Spacing.four },
  ltr: { direction: 'ltr', gap: Spacing.one },
});
