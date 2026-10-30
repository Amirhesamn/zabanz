import type { Skill } from '@zabanz/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Loading, Row, Screen, Section } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { bookmarkIds, listPassages, mistakeIds, topicCounts } from '@/db/repo';
import { useFocusData } from '@/hooks/use-focus-data';
import { useTheme } from '@/hooks/use-theme';
import { fa, SKILL_FA, topicFa } from '@/lib/format';

const SKILLS: Skill[] = ['grammar', 'vocab', 'reading'];

export default function Practice() {
  const theme = useTheme();
  const [skill, setSkill] = useState<Skill>('grammar');
  const [data] = useFocusData(async (db) => {
    const [grammar, vocab, passages, bookmarks, mistakes] = await Promise.all([
      topicCounts(db, 'grammar'), topicCounts(db, 'vocab'), listPassages(db), bookmarkIds(db), mistakeIds(db),
    ]);
    return { grammar, vocab, passages, bookmarks: bookmarks.length, mistakes: mistakes.length };
  });
  if (!data) return <Loading />;

  return (
    <Screen>
      <ThemedText type="title">تمرین</ThemedText>

      <Section title="مرور">
        <Row title="دفتر اشتباهات" detail="سؤال‌هایی که اشتباه جواب دادی" right={fa(data.mistakes)}
          onPress={() => data.mistakes && router.push({ pathname: '/session', params: { mode: 'mistakes' } })} />
        <Row title="نشان‌شده‌ها" detail="سؤال‌هایی که نشان کردی" right={fa(data.bookmarks)}
          onPress={() => data.bookmarks && router.push({ pathname: '/session', params: { mode: 'bookmarks' } })} />
      </Section>

      <View style={[styles.segment, { backgroundColor: theme.surface2 }]} accessibilityRole="tablist">
        {SKILLS.map((s) => (
          <Pressable key={s} accessibilityRole="tab" accessibilityState={{ selected: s === skill }} onPress={() => setSkill(s)}
            style={[styles.segItem, s === skill && { backgroundColor: theme.surface }]}>
            <ThemedText type="smallBold" themeColor={s === skill ? 'brand' : 'textSecondary'} style={{ textAlign: 'center' }}>{SKILL_FA[s]}</ThemedText>
          </Pressable>
        ))}
      </View>

      {skill === 'reading' ? (
        <Section title="متن‌ها">
          {data.passages.map((p) => (
            <Row key={p.id} title={p.title} detail={`${p.cefr} · ${fa(p.questions)} سؤال${p.answered ? ` · ${fa(p.answered)} پاسخ داده` : ''}`}
              onPress={() => router.push({ pathname: '/session', params: { mode: 'reading', passage: p.id } })} />
          ))}
        </Section>
      ) : (
        <Section title="مبحث‌ها">
          {data[skill].map((t) => (
            <Row key={t.topic} title={topicFa(t.topic)} detail={`${fa(t.total)} سؤال${t.answered ? ` · ${fa(t.answered)} پاسخ داده` : ''}`}
              onPress={() => router.push({ pathname: '/session', params: { mode: 'topic', skill, topic: t.topic } })} />
          ))}
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', borderRadius: Radius.md, padding: Spacing.one, gap: Spacing.one },
  segItem: { flex: 1, minHeight: 44, borderRadius: Radius.sm, justifyContent: 'center' },
});
