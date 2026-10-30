import {
  isDue, newCard, review, toDay, updateMistake, weakTopics, XP,
  type AttemptLite, type Card, type Day, type Passage, type Question, type Skill,
} from '@zabanz/shared';
import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getProfile, saveProfile } from './profile';

type QuestionRow = Omit<Question, 'options' | 'exams' | 'status'> & { options: string };
export type StoredQuestion = Omit<Question, 'exams' | 'status'>;

const toQuestion = (r: QuestionRow): StoredQuestion => ({ ...r, options: JSON.parse(r.options) });

export async function questionsWhere(db: SQLiteDatabase, where = '1', ...params: (string | number)[]): Promise<StoredQuestion[]> {
  const rows = await db.getAllAsync<QuestionRow>(`SELECT * FROM questions WHERE ${where}`, ...params);
  return rows.map(toQuestion);
}

export async function questionsByIds(db: SQLiteDatabase, ids: string[]): Promise<StoredQuestion[]> {
  if (!ids.length) return [];
  const byId = new Map((await questionsWhere(db, `id IN (${ids.map(() => '?').join(',')})`, ...ids)).map((q) => [q.id, q]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export const getPassage = (db: SQLiteDatabase, id: string) =>
  db.getFirstAsync<Omit<Passage, 'status'>>('SELECT * FROM passages WHERE id = ?', id);

export const listPassages = (db: SQLiteDatabase) =>
  db.getAllAsync<{ id: string; title: string; cefr: string; questions: number; answered: number }>(`
    SELECT p.id, p.title, p.cefr, COUNT(q.id) AS questions,
      (SELECT COUNT(DISTINCT a.question_id) FROM attempts a JOIN questions q2 ON q2.id = a.question_id WHERE q2.passage_id = p.id) AS answered
    FROM passages p JOIN questions q ON q.passage_id = p.id GROUP BY p.id ORDER BY p.cefr, p.id`);

export const topicCounts = (db: SQLiteDatabase, skill: Skill) =>
  db.getAllAsync<{ topic: string; total: number; answered: number }>(`
    SELECT q.topic, COUNT(*) AS total, COUNT(DISTINCT a.question_id) AS answered
    FROM questions q LEFT JOIN attempts a ON a.question_id = q.id
    WHERE q.skill = ? GROUP BY q.topic ORDER BY q.topic`, skill);

export async function seenIds(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ question_id: string }>('SELECT DISTINCT question_id FROM attempts');
  return new Set(rows.map((r) => r.question_id));
}

export async function attemptsLite(db: SQLiteDatabase, sinceDay?: Day): Promise<AttemptLite[]> {
  const rows = await db.getAllAsync<{ skill: string; topic: string; correct: number }>(
    `SELECT q.skill, q.topic, a.correct FROM attempts a JOIN questions q ON q.id = a.question_id WHERE a.day >= ?`,
    sinceDay ?? '0000-00-00',
  );
  return rows.map((r) => ({ ...r, correct: r.correct === 1 }));
}

export const getWeakTopics = async (db: SQLiteDatabase) => weakTopics(await attemptsLite(db));

// --- attempts + mistake notebook ---

export async function recordAttempt(
  db: SQLiteDatabase,
  a: { question: StoredQuestion; chosen: number; timeMs: number; sessionId: string; mode: string },
) {
  const correct = a.chosen === a.question.answer;
  const today = toDay();
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      'INSERT INTO attempts (id, question_id, question_version, chosen, correct, time_ms, session_id, mode, day, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      randomUUID(), a.question.id, a.question.version, a.chosen, correct ? 1 : 0, a.timeMs, a.sessionId, a.mode, today, now,
    );
    const row = await tx.getFirstAsync<{ correct_days: number; last_correct_day: string | null }>(
      'SELECT correct_days, last_correct_day FROM mistakes WHERE question_id = ?', a.question.id,
    );
    const next = updateMistake(row && { correctDays: row.correct_days, lastCorrectDay: row.last_correct_day }, correct, today);
    if (next) await tx.runAsync('INSERT OR REPLACE INTO mistakes VALUES (?, ?, ?, ?)', a.question.id, next.correctDays, next.lastCorrectDay, now);
    else await tx.runAsync('DELETE FROM mistakes WHERE question_id = ?', a.question.id);
  });
  return correct;
}

export async function mistakeIds(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ question_id: string }>('SELECT question_id FROM mistakes ORDER BY updated_at DESC');
  return rows.map((r) => r.question_id);
}

// --- bookmarks ---

export async function bookmarkIds(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ question_id: string }>('SELECT question_id FROM bookmarks ORDER BY created_at DESC');
  return rows.map((r) => r.question_id);
}

export async function toggleBookmark(db: SQLiteDatabase, questionId: string): Promise<boolean> {
  const del = await db.runAsync('DELETE FROM bookmarks WHERE question_id = ?', questionId);
  if (del.changes) return false;
  await db.runAsync('INSERT INTO bookmarks VALUES (?, ?)', questionId, new Date().toISOString());
  return true;
}

// --- Leitner word cards ---

export type WordCard = Card & { id: string; lemma: string; pos: string; ipa: string | null; meaning_fa: string; example: string };
type CardRow = Omit<WordCard, 'due'> & { due: string | null };

const CARD_SELECT = `SELECT w.id, w.lemma, w.pos, w.ipa, w.meaning_fa, w.example, c.box, c.due, c.lapses
  FROM srs_cards c JOIN words w ON w.id = c.item_id WHERE c.item_type = 'word'`;

export async function dueWordCards(db: SQLiteDatabase, today = toDay()): Promise<WordCard[]> {
  const rows = await db.getAllAsync<CardRow>(`${CARD_SELECT} AND c.due IS NOT NULL AND c.due <= ? ORDER BY c.box, c.due`, today);
  return rows.filter((c) => isDue(c, today));
}

export const boxCounts = (db: SQLiteDatabase) =>
  db.getAllAsync<{ box: number; n: number }>("SELECT box, COUNT(*) AS n FROM srs_cards WHERE item_type = 'word' GROUP BY box");

export async function wordsNotInBox(db: SQLiteDatabase) {
  const r = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM words WHERE id NOT IN (SELECT item_id FROM srs_cards WHERE item_type = 'word')");
  return r?.n ?? 0;
}

/** Adds up to the daily new-word cap; returns how many were added today in total. */
export async function addNewWords(db: SQLiteDatabase, today = toDay()): Promise<number> {
  const p = await getProfile(db);
  const addedToday = (await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM srs_cards WHERE item_type = 'word' AND created_day = ?", today))?.n ?? 0;
  const room = p.newWordsPerDay - addedToday;
  if (room <= 0) return addedToday;
  const fresh = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM words WHERE id NOT IN (SELECT item_id FROM srs_cards WHERE item_type = 'word')
     ORDER BY CASE cefr WHEN ? THEN 0 ELSE 1 END, cefr, id LIMIT ?`, p.level, room,
  );
  const c = newCard(today);
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    for (const w of fresh) await tx.runAsync('INSERT INTO srs_cards VALUES (?, ?, ?, ?, ?, ?, ?)', 'word', w.id, c.box, c.due, c.lapses, today, now);
  });
  return addedToday + fresh.length;
}

export async function reviewWord(db: SQLiteDatabase, card: WordCard, remembered: boolean) {
  const next = review(card, remembered, toDay());
  await db.runAsync(
    "UPDATE srs_cards SET box = ?, due = ?, lapses = ?, updated_at = ? WHERE item_type = 'word' AND item_id = ?",
    next.box, next.due, next.lapses, new Date().toISOString(), card.id,
  );
  const p = await getProfile(db);
  await saveProfile(db, { xp: p.xp + XP.cardReview });
  return next;
}

export async function reportQuestion(db: SQLiteDatabase, questionId: string, reason: string) {
  // shortcut: reports stay local in kv until the API sync exists (milestone 5).
  const key = `report:${randomUUID()}`;
  await db.runAsync('INSERT INTO kv VALUES (?, ?)', key, JSON.stringify({ questionId, reason, at: new Date().toISOString() }));
}
