import {
  FREE, FREE_FREEZES_PER_WEEK, daysBetween, isPlus, recordActivity, shouldShowInterstitial, spendFreezes, XP,
  type Cefr, type Day, type Entitlement, type Streak,
} from '@zabanz/shared';
import type { SQLiteDatabase } from 'expo-sqlite';

export type TargetExam = 'konkur' | 'msrt' | 'ielts' | 'general';

export type Profile = {
  level: Cefr;
  onboarded: boolean;
  targetExam: TargetExam;
  dailyMinutes: number;
  xp: number;
  streak: Streak;
  // free tier gets FREE_FREEZES_PER_WEEK per (Saturday-based) week; rewarded ads add bonusFreezes
  freezeWeek: number;
  freezesUsedThisWeek: number;
  bonusFreezes: number;
  lessonsSinceAd: number;
  doubleXpLessons: number;
  simulatorUnlocks: number;
  newWordsPerDay: number;
  entitlement: Entitlement;
};

const DEFAULT: Profile = {
  level: 'A2', onboarded: false, targetExam: 'general', dailyMinutes: 10, xp: 0, streak: { count: 0, lastDay: null },
  freezeWeek: 0, freezesUsedThisWeek: 0, bonusFreezes: 0, lessonsSinceAd: 0, doubleXpLessons: 0, simulatorUnlocks: 0,
  newWordsPerDay: 10, entitlement: FREE,
};

export async function getProfile(db: SQLiteDatabase): Promise<Profile> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM kv WHERE key = 'profile'");
  return row ? { ...DEFAULT, ...JSON.parse(row.value) } : DEFAULT;
}

export async function saveProfile(db: SQLiteDatabase, patch: Partial<Profile>): Promise<Profile> {
  const next = { ...(await getProfile(db)), ...patch };
  await db.runAsync("INSERT OR REPLACE INTO kv VALUES ('profile', ?)", JSON.stringify(next));
  return next;
}

// 2024-01-06 was a Saturday, the first day of the Iranian week.
export const weekIndex = (day: Day) => Math.floor(daysBetween('2024-01-06', day) / 7);

export function freezesAvailable(p: Profile, today: Day): number {
  if (isPlus(p.entitlement)) return Infinity;
  const used = p.freezeWeek === weekIndex(today) ? p.freezesUsedThisWeek : 0;
  return Math.max(0, FREE_FREEZES_PER_WEEK - used) + p.bonusFreezes;
}

export type LessonResult = { xpGained: number; streak: Streak; freezesUsed: number; showInterstitial: boolean };

export async function finishLesson(db: SQLiteDatabase, correctCount: number, today: Day): Promise<LessonResult> {
  const p = await getProfile(db);
  const plus = isPlus(p.entitlement);
  const doubled = p.doubleXpLessons > 0;
  const xpGained = (correctCount * XP.correct + XP.lessonComplete) * (doubled ? 2 : 1);

  const { streak, freezesUsed } = recordActivity(p.streak, today, freezesAvailable(p, today));
  const week = weekIndex(today);
  const current = { usedThisWeek: p.freezeWeek === week ? p.freezesUsedThisWeek : 0, bonus: p.bonusFreezes };
  const { usedThisWeek, bonus } = plus ? current : spendFreezes(current, freezesUsed, FREE_FREEZES_PER_WEEK);

  const lessonsSinceAd = p.lessonsSinceAd + 1;
  const showInterstitial = shouldShowInterstitial(plus, lessonsSinceAd);
  await saveProfile(db, {
    xp: p.xp + xpGained, streak, freezeWeek: week, freezesUsedThisWeek: usedThisWeek, bonusFreezes: bonus,
    lessonsSinceAd: showInterstitial ? 0 : lessonsSinceAd, doubleXpLessons: Math.max(0, p.doubleXpLessons - 1),
  });
  return { xpGained, streak, freezesUsed, showInterstitial };
}
