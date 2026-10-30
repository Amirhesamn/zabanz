import type { Pack } from '@zabanz/shared';
import type { SQLiteDatabase } from 'expo-sqlite';

import { seedPacks } from '@zabanz/content';

// shortcut: seed content is all `draft` (unreviewed), so we show drafts; set false once reviewed packs ship.
const INCLUDE_DRAFTS = true;

const MIGRATIONS = [
  `
  PRAGMA journal_mode = WAL;
  CREATE TABLE questions (
    id TEXT PRIMARY KEY NOT NULL, pack_id TEXT NOT NULL, skill TEXT NOT NULL, topic TEXT NOT NULL, cefr TEXT NOT NULL,
    difficulty REAL NOT NULL, passage_id TEXT, stem TEXT NOT NULL, options TEXT NOT NULL, answer INTEGER NOT NULL,
    explanation_fa TEXT NOT NULL, version INTEGER NOT NULL
  );
  CREATE INDEX questions_skill_topic ON questions (skill, topic);
  CREATE TABLE passages (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, cefr TEXT NOT NULL, version INTEGER NOT NULL);
  CREATE TABLE words (
    id TEXT PRIMARY KEY NOT NULL, lemma TEXT NOT NULL, pos TEXT NOT NULL, ipa TEXT, meaning_fa TEXT NOT NULL,
    example TEXT NOT NULL, cefr TEXT NOT NULL
  );
  -- append-only; id is a client UUID so re-syncing never double counts
  CREATE TABLE attempts (
    id TEXT PRIMARY KEY NOT NULL, question_id TEXT NOT NULL, question_version INTEGER NOT NULL, chosen INTEGER NOT NULL,
    correct INTEGER NOT NULL, time_ms INTEGER NOT NULL, session_id TEXT NOT NULL, mode TEXT NOT NULL,
    day TEXT NOT NULL, created_at TEXT NOT NULL, synced INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX attempts_question ON attempts (question_id);
  CREATE INDEX attempts_day ON attempts (day);
  CREATE TABLE bookmarks (question_id TEXT PRIMARY KEY NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE mistakes (question_id TEXT PRIMARY KEY NOT NULL, correct_days INTEGER NOT NULL, last_correct_day TEXT, updated_at TEXT NOT NULL);
  CREATE TABLE srs_cards (
    item_type TEXT NOT NULL, item_id TEXT NOT NULL, box INTEGER NOT NULL, due TEXT, lapses INTEGER NOT NULL,
    created_day TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (item_type, item_id)
  );
  CREATE TABLE kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  `,
];

export async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  for (; version < MIGRATIONS.length; version++) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[version]!);
      await tx.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
  await importPacks(db, seedPacks);
}

/** Upserts each pack whose version is newer than what is installed. Attempts keep the question_version they saw. */
export async function importPacks(db: SQLiteDatabase, packs: Pack[]) {
  for (const pack of packs) {
    const key = `pack:${pack.id}`;
    const installed = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
    if (installed && Number(installed.value) >= pack.version) continue;

    const visible = (s: string) => s === 'published' || (INCLUDE_DRAFTS && s !== 'archived');
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const p of pack.passages.filter((x) => visible(x.status)))
        await tx.runAsync('INSERT OR REPLACE INTO passages VALUES (?, ?, ?, ?, ?)', p.id, p.title, p.body, p.cefr, p.version);
      for (const w of pack.words.filter((x) => visible(x.status)))
        await tx.runAsync('INSERT OR REPLACE INTO words VALUES (?, ?, ?, ?, ?, ?, ?)', w.id, w.lemma, w.pos, w.ipa ?? null, w.meaning_fa, w.example, w.cefr);
      for (const q of pack.questions) {
        if (!visible(q.status)) {
          await tx.runAsync('DELETE FROM questions WHERE id = ?', q.id);
          continue;
        }
        await tx.runAsync(
          'INSERT OR REPLACE INTO questions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          q.id, pack.id, q.skill, q.topic, q.cefr, q.difficulty, q.passage_id, q.stem, JSON.stringify(q.options), q.answer, q.explanation_fa, q.version,
        );
      }
      await tx.runAsync('INSERT OR REPLACE INTO kv VALUES (?, ?)', key, String(pack.version));
    });
  }
}
