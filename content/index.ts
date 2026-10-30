// Seed packs bundled into the app for offline use. Validated by `pnpm content:check`, not at runtime.
// All seed items are `draft` (written by Claude, not yet human-reviewed).
import type { Pack } from '@zabanz/shared';
import grammarA2 from './seed/grammar_a2.json';
import grammarB1 from './seed/grammar_b1.json';
import vocabA2 from './seed/vocab_a2.json';
import vocabB1 from './seed/vocab_b1.json';
import readingA2 from './seed/reading_a2.json';
import readingB1 from './seed/reading_b1.json';
import words from './seed/words_a2_b1.json';

export const seedPacks = [grammarA2, grammarB1, vocabA2, vocabB1, readingA2, readingB1, words] as Pack[];
