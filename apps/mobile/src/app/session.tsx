import { buildPlacement, composeLesson, isPlus, placementLevel, shuffle, toDay, type Cefr, type Passage } from '@zabanz/shared';
import * as Haptics from 'expo-haptics';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, CloseButton, goBack, Loading, ProgressBar, Screen } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { finishLesson, getProfile, saveProfile, type LessonResult } from '@/db/profile';
import {
  bookmarkIds, getPassage, getWeakTopics, mistakeIds, questionsByIds, questionsWhere, recordAttempt, reportQuestion, seenIds, toggleBookmark,
  type StoredQuestion,
} from '@/db/repo';
import { useTheme } from '@/hooks/use-theme';
import { fa } from '@/lib/format';
import { ads } from '@/services/ads';

type Mode = 'daily' | 'topic' | 'mistakes' | 'bookmarks' | 'reading' | 'placement';
type Params = { mode: Mode; skill?: string; topic?: string; passage?: string };

async function loadQuestions(db: SQLiteDatabase, p: Params): Promise<StoredQuestion[]> {
  switch (p.mode) {
    case 'daily': {
      const [profile, pool, weak, mistakes, seen] = await Promise.all([getProfile(db), questionsWhere(db), getWeakTopics(db), mistakeIds(db), seenIds(db)]);
      return composeLesson({ pool, level: profile.level, weakTopics: weak, mistakeIds: mistakes, seenIds: seen });
    }
    case 'topic': {
      const [pool, seen] = await Promise.all([questionsWhere(db, 'skill = ? AND topic = ?', p.skill ?? '', p.topic ?? ''), seenIds(db)]);
      return [...shuffle(pool.filter((q) => !seen.has(q.id))), ...shuffle(pool.filter((q) => seen.has(q.id)))].slice(0, 10);
    }
    case 'mistakes':
      return questionsByIds(db, (await mistakeIds(db)).slice(0, 10));
    case 'bookmarks':
      return questionsByIds(db, (await bookmarkIds(db)).slice(0, 20));
    case 'reading':
      return questionsWhere(db, 'passage_id = ? ORDER BY id', p.passage ?? '');
    case 'placement':
      return buildPlacement(await questionsWhere(db));
  }
}

type Answer = { question: StoredQuestion; chosen: number; correct: boolean };

export default function Session() {
  const params = useLocalSearchParams<Params>();
  const db = useSQLiteContext();
  const [questions, setQuestions] = useState<StoredQuestion[]>();
  const [passage, setPassage] = useState<Omit<Passage, 'status'> | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [done, setDone] = useState(false);
  const shownAt = useRef(Date.now());
  const sessionId = useMemo(() => randomUUID(), []);
  const placement = params.mode === 'placement';

  useEffect(() => {
    (async () => {
      const qs = await loadQuestions(db, params);
      if (params.mode === 'reading' && params.passage) setPassage(await getPassage(db, params.passage));
      setBookmarks(new Set(await bookmarkIds(db)));
      setQuestions(qs);
    })();
    // params are fixed for the life of the modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // option display order is shuffled once per question so the answer position cannot be learned
  const orders = useMemo(() => (questions ?? []).map(() => shuffle([0, 1, 2, 3])), [questions]);

  if (!questions) return <Loading />;
  if (!questions.length)
    return (
      <Screen edges={['top', 'bottom']}>
        <CloseButton />
        <ThemedText type="heading">سؤالی برای نمایش نیست</ThemedText>
        <ThemedText themeColor="textSecondary">این بخش فعلاً خالی است.</ThemedText>
        <Button title="بازگشت" onPress={goBack} />
      </Screen>
    );
  if (done) return <Summary answers={answers} mode={params.mode} />;

  const q = questions[index]!;
  const answered = chosen !== null;

  async function choose(option: number) {
    if (answered) return;
    setChosen(option);
    const correct = await recordAttempt(db, { question: q, chosen: option, timeMs: Date.now() - shownAt.current, sessionId, mode: params.mode });
    Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    setAnswers((a) => [...a, { question: q, chosen: option, correct }]);
    if (placement) setTimeout(next, 350);
  }

  function next() {
    if (index + 1 >= questions!.length) return setDone(true);
    setIndex((i) => i + 1);
    setChosen(null);
    shownAt.current = Date.now();
  }

  function report() {
    const send = (reason: string) => reportQuestion(db, q.id, reason).then(() => Alert.alert('ممنون!', 'گزارش ثبت شد و بررسی می‌شود.'));
    Alert.alert('ایراد این سؤال چیست؟', undefined, [
      { text: 'پاسخ درست اشتباه است', onPress: () => send('wrong_answer') },
      { text: 'سؤال مبهم است', onPress: () => send('ambiguous') },
      { text: 'غلط تایپی دارد', onPress: () => send('typo') },
      { text: 'انصراف', style: 'cancel' },
    ]);
  }

  async function bookmark() {
    const on = await toggleBookmark(db, q.id);
    setBookmarks((b) => {
      const n = new Set(b);
      if (on) n.add(q.id);
      else n.delete(q.id);
      return n;
    });
  }

  return (
    <SessionFrame progress={(index + (answered ? 1 : 0)) / questions.length} counter={`${fa(index + 1)} / ${fa(questions.length)}`}>
      {passage && <PassageView passage={passage} />}
      <QuestionView question={q} order={orders[index]!} chosen={chosen} onChoose={choose} hideFeedback={placement} />
      {answered && !placement && (
        <Feedback
          correct={chosen === q.answer}
          explanation={q.explanation_fa}
          bookmarked={bookmarks.has(q.id)}
          onBookmark={bookmark}
          onReport={report}
          onNext={next}
          last={index + 1 >= questions.length}
        />
      )}
    </SessionFrame>
  );
}

function SessionFrame({ progress, counter, children }: { progress: number; counter: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.top}>
        <CloseButton />
        <View style={{ flex: 1 }}>
          <ProgressBar value={progress} />
        </View>
        <ThemedText type="smallBold" themeColor="textSecondary">{counter}</ThemedText>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PassageView({ passage }: { passage: Omit<Passage, 'status'> }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <ThemedText type="smallBold" themeColor="brand">{open ? 'بستن متن ▲' : 'نمایش متن ▼'}</ThemedText>
      </Pressable>
      {open && (
        <View style={styles.ltr}>
          <ThemedText type="latin" style={{ fontWeight: 700 }}>{passage.title}</ThemedText>
          <ThemedText type="latin" style={{ fontSize: 16, lineHeight: 27 }}>{passage.body}</ThemedText>
        </View>
      )}
    </Card>
  );
}

function QuestionView({ question, order, chosen, onChoose, hideFeedback }: {
  question: StoredQuestion; order: number[]; chosen: number | null; onChoose: (i: number) => void; hideFeedback: boolean;
}) {
  const theme = useTheme();
  const answered = chosen !== null;
  return (
    <View style={{ gap: Spacing.three }}>
      <View style={styles.ltr}>
        <ThemedText type="latin" style={{ fontSize: 20, lineHeight: 32 }}>{question.stem}</ThemedText>
      </View>
      <View style={{ gap: Spacing.two }}>
        {order.map((i, pos) => {
          const isAnswer = i === question.answer;
          const isChosen = i === chosen;
          const state = !answered || hideFeedback ? (isChosen ? 'chosen' : 'idle') : isAnswer ? 'ok' : isChosen ? 'bad' : 'dim';
          const colors = {
            idle: [theme.surface, theme.line],
            chosen: [theme.brandSoft, theme.brand],
            ok: [theme.okSoft, theme.ok],
            bad: [theme.badSoft, theme.bad],
            dim: [theme.surface, theme.line],
          }[state];
          const mark = state === 'ok' ? '✓' : state === 'bad' ? '✗' : String.fromCharCode(65 + pos);
          const label = state === 'ok' ? 'پاسخ درست' : state === 'bad' ? 'پاسخ شما، نادرست' : undefined;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${question.options[i]}${label ? `، ${label}` : ''}`}
              disabled={answered}
              onPress={() => onChoose(i)}
              style={({ pressed }) => [styles.option, styles.ltr, { backgroundColor: colors[0], borderColor: colors[1], opacity: state === 'dim' ? 0.6 : pressed ? 0.8 : 1 }]}>
              <View style={[styles.mark, { borderColor: colors[1], backgroundColor: state === 'ok' || state === 'bad' ? colors[1] : 'transparent' }]}>
                <ThemedText type="smallBold" style={{ color: state === 'ok' || state === 'bad' ? theme.surface : theme.textSecondary, textAlign: 'center' }}>{mark}</ThemedText>
              </View>
              <ThemedText type="latin" style={{ flex: 1 }}>{question.options[i]}</ThemedText>
              {label ? <ThemedText type="small" style={{ color: colors[1] }}>{state === 'ok' ? 'درست' : 'نادرست'}</ThemedText> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Feedback({ correct, explanation, bookmarked, onBookmark, onReport, onNext, last }: {
  correct: boolean; explanation: string; bookmarked: boolean; onBookmark: () => void; onReport: () => void; onNext: () => void; last: boolean;
}) {
  return (
    <View style={{ gap: Spacing.three }} accessibilityLiveRegion="polite">
      <Card tone={correct ? 'brandSoft' : 'accentSoft'}>
        <ThemedText type="heading" themeColor={correct ? 'ok' : 'bad'}>{correct ? '✓ درست است!' : '✗ نادرست'}</ThemedText>
        <ThemedText>💡 {explanation}</ThemedText>
      </Card>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        <Button style={{ flex: 1 }} variant="secondary" title={bookmarked ? '★ نشان شده' : '☆ نشان کن'} onPress={onBookmark} />
        <Button style={{ flex: 1 }} variant="secondary" title="⚑ گزارش ایراد" onPress={onReport} />
      </View>
      <Button title={last ? 'پایان و دیدن نتیجه' : 'سؤال بعدی'} onPress={onNext} />
    </View>
  );
}

function Summary({ answers, mode }: { answers: Answer[]; mode: Mode }) {
  const db = useSQLiteContext();
  const [result, setResult] = useState<LessonResult & { plus: boolean }>();
  const [level, setLevel] = useState<Cefr>();
  const [rewarded, setRewarded] = useState(false);
  const correct = answers.filter((a) => a.correct).length;

  useEffect(() => {
    (async () => {
      if (mode === 'placement') {
        const lvl = placementLevel(answers.map((a) => ({ cefr: a.question.cefr, correct: a.correct })));
        await saveProfile(db, { level: lvl });
        return setLevel(lvl);
      }
      const r = await finishLesson(db, correct, toDay());
      const plus = isPlus((await getProfile(db)).entitlement);
      setResult({ ...r, plus });
      // only ever after a finished lesson, never mid-question
      if (r.showInterstitial) ads.showInterstitial();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function watchForDoubleXp() {
    if (!(await ads.showRewarded())) return;
    const p = await getProfile(db);
    await saveProfile(db, { doubleXpLessons: p.doubleXpLessons + 1 });
    setRewarded(true);
  }

  if (mode === 'placement') {
    if (!level) return <Loading />;
    return (
      <Screen edges={['top', 'bottom']}>
        <ThemedText type="title">سطح تو: {level}</ThemedText>
        <ThemedText themeColor="textSecondary">
          از ۱۲ سؤال {fa(correct)} تا را درست جواب دادی. درس‌های روزانه از سطح {level === 'B1' ? 'متوسط' : 'مقدماتی'} شروع می‌شوند و هر وقت خواستی می‌توانی سطح را از بخش «من» عوض کنی.
        </ThemedText>
        <Button title="شروع اولین درس" onPress={() => router.replace({ pathname: '/session', params: { mode: 'daily' } })} />
        <Button variant="ghost" title="رفتن به خانه" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  if (!result) return <Loading />;
  const wrong = answers.filter((a) => !a.correct);

  return (
    <Screen edges={['top', 'bottom']}>
      <ThemedText type="title">{correct === answers.length ? 'بی‌نقص! 🎉' : 'آفرین، تمام شد!'}</ThemedText>
      <View style={{ flexDirection: 'row', gap: Spacing.three }}>
        <Card style={{ flex: 1 }}>
          <ThemedText type="number" themeColor="brand">{fa(correct)}/{fa(answers.length)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">پاسخ درست</ThemedText>
        </Card>
        <Card style={{ flex: 1 }}>
          <ThemedText type="number" themeColor="brand">+{fa(result.xpGained)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">امتیاز (XP)</ThemedText>
        </Card>
        <Card style={{ flex: 1 }}>
          <ThemedText type="number" themeColor="accent">🔥{fa(result.streak.count)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">روز پیاپی</ThemedText>
        </Card>
      </View>
      {result.freezesUsed > 0 && (
        <Card tone="surface2">
          <ThemedText>❄️ {fa(result.freezesUsed)} یخ‌زدن استریک استفاده شد تا زنجیره‌ات نشکند.</ThemedText>
        </Card>
      )}
      {wrong.length > 0 && (
        <Card>
          <ThemedText type="smallBold">{fa(wrong.length)} سؤال به دفتر اشتباهات رفت</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">اگر در دو روز مختلف درست جوابشان بدهی، از دفتر خارج می‌شوند.</ThemedText>
        </Card>
      )}
      {!result.plus && (
        <Card tone="brandSoft">
          {rewarded ? (
            <ThemedText type="smallBold" themeColor="brand">✓ امتیاز درس بعدی دو برابر می‌شود.</ThemedText>
          ) : (
            <>
              <ThemedText type="smallBold">امتیاز درس بعدی را دو برابر کن</ThemedText>
              <Button variant="secondary" title="▶ تماشای تبلیغ کوتاه" onPress={watchForDoubleXp} />
            </>
          )}
        </Card>
      )}
      <Button title="بازگشت به خانه" onPress={goBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  scroll: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four, paddingTop: Spacing.two },
  ltr: { direction: 'ltr' },
  option: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  mark: { width: 30, height: 30, borderRadius: Radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
