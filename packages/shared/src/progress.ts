import { daysBetween, type Day } from './dates';

export const XP = { correct: 10, lessonComplete: 20, cardReview: 5 } as const;

export type Streak = { count: number; lastDay: Day | null };

/**
 * Call when the user finishes a lesson. Each missed day in between costs one freeze;
 * `freezesAvailable` is Infinity for Plus. Returns how many freezes were spent.
 */
export function recordActivity(s: Streak, today: Day, freezesAvailable: number): { streak: Streak; freezesUsed: number } {
  if (s.lastDay === null) return { streak: { count: 1, lastDay: today }, freezesUsed: 0 };
  const gap = daysBetween(s.lastDay, today);
  if (gap <= 0) return { streak: s, freezesUsed: 0 };
  const missed = gap - 1;
  if (missed <= freezesAvailable) return { streak: { count: s.count + 1, lastDay: today }, freezesUsed: missed };
  return { streak: { count: 1, lastDay: today }, freezesUsed: 0 };
}

/** Spends `used` freezes: the weekly free allowance first, then rewarded-ad bonus freezes. */
export function spendFreezes(s: { usedThisWeek: number; bonus: number }, used: number, weeklyAllowance: number) {
  const fromWeekly = Math.min(used, Math.max(0, weeklyAllowance - s.usedThisWeek));
  return { usedThisWeek: s.usedThisWeek + fromWeekly, bonus: s.bonus - (used - fromWeekly) };
}

/** Streak as shown on the home screen: 0 once a day is missed (before freezes are applied on next activity). */
export function displayStreak(s: Streak, today: Day): number {
  if (s.lastDay === null) return 0;
  return daysBetween(s.lastDay, today) <= 1 ? s.count : 0;
}
