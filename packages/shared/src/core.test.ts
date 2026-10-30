import { describe, expect, it } from 'vitest';
import {
  addDays, buildPlacement, composeLesson, placementLevel, daysBetween, displayStreak, isDue, isPlus, newCard, Question, recordActivity,
  review, shouldShowInterstitial, spendFreezes, updateMistake, weakTopics, Pack, type Question as Q,
} from './index';

const q = (over: Partial<Q> = {}): Q => ({
  id: 'gr_b1_x_0001', skill: 'grammar', topic: 'conditionals.second', cefr: 'B1', difficulty: 0.5,
  exams: ['general'], passage_id: null, stem: 'If I ____ time, I would go.', options: ['have', 'had', 'will have', 'would have'],
  answer: 1, explanation_fa: 'شرطی نوع دوم.', status: 'draft', version: 1, ...over,
});

describe('dates', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-03-20', '2026-03-22')).toBe(2);
  });
});

describe('schema', () => {
  it('accepts a valid question', () => expect(Question.safeParse(q()).success).toBe(true));
  it('rejects duplicate options', () => expect(Question.safeParse(q({ options: ['a', 'A', 'b', 'c'] })).success).toBe(false));
  it('rejects reading without passage', () => expect(Question.safeParse(q({ skill: 'reading' })).success).toBe(false));
  it('rejects pack with unknown passage and duplicate ids', () => {
    const r = Pack.safeParse({ id: 'p', version: 1, cefr: 'B1', questions: [q(), q({ skill: 'reading', passage_id: 'nope' })] });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.message).join()).toMatch(/duplicate.*|unknown passage/);
  });
});

describe('leitner', () => {
  const today = '2026-10-30';
  it('walks boxes 1-5 then learned', () => {
    let c = newCard(today);
    expect(isDue(c, today)).toBe(true);
    const dues = [];
    for (let i = 0; i < 4; i++) {
      c = review(c, true, today);
      dues.push(daysBetween(today, c.due!));
    }
    expect(dues).toEqual([2, 4, 8, 16]);
    expect(c.box).toBe(5);
    c = review(c, true, today);
    expect(c).toMatchObject({ box: 6, due: null });
  });
  it('wrong answer goes back to box 1, due tomorrow', () => {
    const c = review({ box: 4, due: today, lapses: 0 }, false, today);
    expect(c).toEqual({ box: 1, due: '2026-10-31', lapses: 1 });
  });
  it('overdue stays due', () => expect(isDue({ box: 2, due: '2026-10-01', lapses: 0 }, today)).toBe(true));
});

describe('mistakes', () => {
  it('needs correct answers on two different days to clear', () => {
    let m = updateMistake(null, false, '2026-10-01');
    m = updateMistake(m, true, '2026-10-02');
    m = updateMistake(m, true, '2026-10-02'); // same day does not count twice
    expect(m).toEqual({ correctDays: 1, lastCorrectDay: '2026-10-02' });
    expect(updateMistake(m, true, '2026-10-03')).toBeNull();
  });
  it('correct answer on a question not in notebook stays out', () => expect(updateMistake(null, true, '2026-10-01')).toBeNull());
  it('wrong again resets progress', () => expect(updateMistake({ correctDays: 1, lastCorrectDay: '2026-10-01' }, false, '2026-10-02')).toEqual({ correctDays: 0, lastCorrectDay: null }));
});

describe('streak', () => {
  it('continues, freezes, resets', () => {
    let s = recordActivity({ count: 0, lastDay: null }, '2026-10-01', 0).streak;
    s = recordActivity(s, '2026-10-02', 0).streak;
    expect(s.count).toBe(2);
    expect(recordActivity(s, '2026-10-02', 0).streak.count).toBe(2);
    const frozen = recordActivity(s, '2026-10-04', 1);
    expect(frozen).toEqual({ streak: { count: 3, lastDay: '2026-10-04' }, freezesUsed: 1 });
    expect(recordActivity(s, '2026-10-05', 1).streak.count).toBe(1);
    expect(recordActivity(s, '2026-10-20', Infinity).streak.count).toBe(3);
  });
  it('spends weekly freeze before bonus freezes', () => {
    expect(spendFreezes({ usedThisWeek: 0, bonus: 2 }, 1, 1)).toEqual({ usedThisWeek: 1, bonus: 2 });
    expect(spendFreezes({ usedThisWeek: 0, bonus: 2 }, 3, 1)).toEqual({ usedThisWeek: 1, bonus: 0 });
    expect(spendFreezes({ usedThisWeek: 1, bonus: 1 }, 1, 1)).toEqual({ usedThisWeek: 1, bonus: 0 });
  });
  it('display drops to 0 after a missed day', () => {
    expect(displayStreak({ count: 5, lastDay: '2026-10-01' }, '2026-10-02')).toBe(5);
    expect(displayStreak({ count: 5, lastDay: '2026-10-01' }, '2026-10-03')).toBe(0);
  });
});

describe('lesson', () => {
  const pool = [
    ...Array.from({ length: 20 }, (_, i) => q({ id: `b1_${i}`, topic: 'tenses.present', cefr: 'B1' })),
    ...Array.from({ length: 5 }, (_, i) => q({ id: `weak_${i}`, topic: 'prepositions', cefr: 'A2' })),
    q({ id: 'read_1', skill: 'reading', passage_id: 'p1' }),
  ];
  it('mixes mistakes, weak topics and level, no duplicates, no reading', () => {
    const l = composeLesson({ pool, level: 'B1', weakTopics: ['prepositions'], mistakeIds: ['b1_3', 'b1_4', 'b1_5'], seenIds: new Set() });
    const ids = l.map((x) => x.id);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    expect(ids.filter((i) => ['b1_3', 'b1_4', 'b1_5'].includes(i)).length).toBeGreaterThanOrEqual(2);
    expect(ids.filter((i) => i.startsWith('weak_')).length).toBe(2);
    expect(ids).not.toContain('read_1');
  });
  it('fills from anything when level pool is small', () => {
    expect(composeLesson({ pool, level: 'C1', weakTopics: [], mistakeIds: [], seenIds: new Set() })).toHaveLength(10);
  });
});

describe('placement', () => {
  const pool = [
    ...Array.from({ length: 10 }, (_, i) => q({ id: `a_${i}`, cefr: 'A2', topic: `t${i % 8}` })),
    ...Array.from({ length: 10 }, (_, i) => q({ id: `b_${i}`, cefr: 'B1', topic: `t${i % 8}` })),
  ];
  it('picks 6 per level across distinct topics', () => {
    const p = buildPlacement(pool);
    expect(p.filter((x) => x.cefr === 'A2')).toHaveLength(6);
    expect(new Set(p.filter((x) => x.cefr === 'B1').map((x) => x.topic)).size).toBe(6);
  });
  it('scores B1 only when both levels are mostly right', () => {
    const r = (cefr: 'A2' | 'B1', n: number) => Array.from({ length: 6 }, (_, i) => ({ cefr, correct: i < n }));
    expect(placementLevel([...r('A2', 6), ...r('B1', 4)])).toBe('B1');
    expect(placementLevel([...r('A2', 3), ...r('B1', 6)])).toBe('A2');
    expect(placementLevel([...r('A2', 6), ...r('B1', 3)])).toBe('A2');
  });
});

describe('stats', () => {
  it('needs enough samples before calling a topic weak', () => {
    const a = (topic: string, correct: boolean) => ({ skill: 'grammar', topic, correct });
    const attempts = [...Array(8).fill(a('preps', false)), a('few', false), a('few', false), ...Array(10).fill(a('good', true))];
    expect(weakTopics(attempts)).toEqual(['preps']);
  });
});

describe('plans', () => {
  it('plus only while not expired', () => {
    const now = new Date('2026-10-30T00:00:00Z');
    expect(isPlus({ plan: 'plus', expiresAt: '2026-11-30T00:00:00Z' }, now)).toBe(true);
    expect(isPlus({ plan: 'plus', expiresAt: '2026-10-01T00:00:00Z' }, now)).toBe(false);
    expect(isPlus({ plan: 'free', expiresAt: null }, now)).toBe(false);
  });
  it('interstitial every 3 lessons, never for plus', () => {
    expect(shouldShowInterstitial(false, 2)).toBe(false);
    expect(shouldShowInterstitial(false, 3)).toBe(true);
    expect(shouldShowInterstitial(true, 10)).toBe(false);
  });
});
