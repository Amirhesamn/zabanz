import type { Day } from './dates';

// GDD: a wrong answer enters the mistake notebook; it leaves after correct answers on 2 different days.
export const CORRECT_DAYS_TO_CLEAR = 2;

export type Mistake = { correctDays: number; lastCorrectDay: Day | null };

/** Returns the new entry, or null when the question is not (or no longer) in the notebook. */
export function updateMistake(entry: Mistake | null, correct: boolean, today: Day): Mistake | null {
  if (!correct) return { correctDays: 0, lastCorrectDay: null };
  if (!entry) return null;
  if (entry.lastCorrectDay === today) return entry;
  const correctDays = entry.correctDays + 1;
  return correctDays >= CORRECT_DAYS_TO_CLEAR ? null : { correctDays, lastCorrectDay: today };
}
