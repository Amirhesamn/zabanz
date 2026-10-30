import type { Cefr, Question } from './schema';

type Lite = Pick<Question, 'id' | 'skill' | 'topic' | 'cefr'>;

export type LessonInput<T extends Lite> = {
  pool: T[];
  level: Cefr;
  weakTopics: string[];
  mistakeIds: string[];
  seenIds: Set<string>;
  size?: number;
  random?: () => number;
};

export function shuffle<T>(xs: T[], random: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// shortcut: fixed 6 A2 + 6 B1 placement, not adaptive; switch to adaptive (GDD: 20 q) once difficulty is calibrated from real answers.
export const PLACEMENT_PER_LEVEL = 6;

export function buildPlacement<T extends Lite>(pool: T[], random: () => number = Math.random): T[] {
  const pick = (cefr: Cefr) => {
    // one question per topic first so the test covers breadth, not one topic six times
    const byTopic = new Map<string, T>();
    for (const q of shuffle(pool.filter((q) => q.cefr === cefr && q.skill !== 'reading'), random)) if (!byTopic.has(q.topic)) byTopic.set(q.topic, q);
    return shuffle([...byTopic.values()], random).slice(0, PLACEMENT_PER_LEVEL);
  };
  return [...pick('A2'), ...pick('B1')];
}

/** B1 when the user gets at least 4/6 of both A2 and B1 right; otherwise A2. */
export function placementLevel(results: { cefr: Cefr; correct: boolean }[]): Cefr {
  const ok = (c: Cefr) => results.filter((r) => r.cefr === c && r.correct).length;
  return ok('A2') >= 4 && ok('B1') >= 4 ? 'B1' : 'A2';
}

/**
 * Daily lesson per GDD: ~60% current level, ~20% weak topics, ~20% past mistakes.
 * Missing buckets are filled from the level pool, then from anything left.
 * Reading questions are excluded: they belong to a passage and have their own mode.
 */
export function composeLesson<T extends Lite>({ pool, level, weakTopics, mistakeIds, seenIds, size = 10, random = Math.random }: LessonInput<T>): T[] {
  const usable = pool.filter((q) => q.skill !== 'reading');
  const picked = new Map<string, T>();
  // unseen first, each group shuffled
  const order = (qs: T[]) => [...shuffle(qs.filter((q) => !seenIds.has(q.id)), random), ...shuffle(qs.filter((q) => seenIds.has(q.id)), random)];
  const take = (qs: T[], n: number) => {
    for (const q of qs) {
      if (picked.size >= size || n <= 0) return;
      if (!picked.has(q.id)) {
        picked.set(q.id, q);
        n--;
      }
    }
  };

  const mistakeSet = new Set(mistakeIds);
  const weakSet = new Set(weakTopics);
  take(shuffle(usable.filter((q) => mistakeSet.has(q.id)), random), Math.round(size * 0.2));
  take(order(usable.filter((q) => weakSet.has(q.topic))), Math.round(size * 0.2));
  take(order(usable.filter((q) => q.cefr === level)), size);
  take(order(usable), size);
  return shuffle([...picked.values()], random);
}
