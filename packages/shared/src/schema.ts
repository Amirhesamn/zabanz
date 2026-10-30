import { z } from 'zod';

export const SKILLS = ['grammar', 'vocab', 'reading'] as const;
export const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const EXAMS = ['konkur', 'msrt', 'ept', 'ielts', 'toefl', 'general'] as const;
// draft -> review -> published -> archived; only `published` reaches real users
export const STATUSES = ['draft', 'review', 'published', 'archived'] as const;

export const Skill = z.enum(SKILLS);
export const Cefr = z.enum(CEFR);
export const Status = z.enum(STATUSES);

const id = z.string().regex(/^[a-z0-9_]+$/, 'id must be lowercase a-z, 0-9, _');

export const Question = z
  .object({
    id,
    skill: Skill,
    topic: z.string().regex(/^[a-z0-9_]+(\.[a-z0-9_]+)*$/),
    cefr: Cefr,
    difficulty: z.number().min(0).max(1),
    exams: z.array(z.enum(EXAMS)).min(1),
    passage_id: id.nullable(),
    stem: z.string().trim().min(3),
    options: z.tuple([z.string().trim().min(1), z.string().trim().min(1), z.string().trim().min(1), z.string().trim().min(1)]),
    answer: z.number().int().min(0).max(3),
    explanation_fa: z.string().trim().min(5),
    status: Status,
    version: z.number().int().min(1),
  })
  .superRefine((q, ctx) => {
    const lower = q.options.map((o) => o.toLowerCase());
    if (new Set(lower).size !== 4) ctx.addIssue({ code: 'custom', path: ['options'], message: 'options must be distinct' });
    if ((q.skill === 'reading') !== (q.passage_id !== null))
      ctx.addIssue({ code: 'custom', path: ['passage_id'], message: 'reading questions need passage_id, others must be null' });
  });

export const Passage = z.object({
  id,
  title: z.string().trim().min(1),
  body: z.string().trim().min(50),
  cefr: Cefr,
  status: Status,
  version: z.number().int().min(1),
});

export const Word = z.object({
  id,
  lemma: z.string().trim().min(1),
  pos: z.enum(['noun', 'verb', 'adj', 'adv', 'phrase', 'prep', 'conj']),
  ipa: z.string().optional(),
  meaning_fa: z.string().trim().min(1),
  example: z.string().trim().min(3),
  cefr: Cefr,
  lists: z.array(z.string()).default([]),
  status: Status,
});

export const Pack = z
  .object({
    id,
    version: z.number().int().min(1),
    cefr: Cefr,
    questions: z.array(Question),
    passages: z.array(Passage).default([]),
    words: z.array(Word).default([]),
  })
  .superRefine((p, ctx) => {
    const dupes = (ids: string[]) => ids.filter((x, i) => ids.indexOf(x) !== i);
    for (const [key, list] of [['questions', p.questions], ['passages', p.passages], ['words', p.words]] as const) {
      const d = dupes(list.map((x) => x.id));
      if (d.length) ctx.addIssue({ code: 'custom', path: [key], message: `duplicate ids: ${[...new Set(d)].join(', ')}` });
    }
    const passageIds = new Set(p.passages.map((x) => x.id));
    p.questions.forEach((q, i) => {
      if (q.passage_id && !passageIds.has(q.passage_id))
        ctx.addIssue({ code: 'custom', path: ['questions', i, 'passage_id'], message: `unknown passage ${q.passage_id}` });
    });
  });

export type Skill = z.infer<typeof Skill>;
export type Cefr = z.infer<typeof Cefr>;
export type Question = z.infer<typeof Question>;
export type Passage = z.infer<typeof Passage>;
export type Word = z.infer<typeof Word>;
export type Pack = z.infer<typeof Pack>;
