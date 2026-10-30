// Usage: tsx validate-content.ts <dir>  — validates every *.json pack in <dir>; exits 1 on any error.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pack } from '../src/schema';

const dir = process.argv[2];
if (!dir) throw new Error('usage: validate-content <dir>');

let failed = false;
const seen = new Map<string, string>();
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const r = Pack.safeParse(JSON.parse(readFileSync(join(dir, file), 'utf8')));
  if (!r.success) {
    failed = true;
    for (const i of r.error.issues) console.error(`${file}: ${i.path.join('.')}: ${i.message}`);
    continue;
  }
  // ids must be unique across packs too, since attempts reference them globally
  for (const x of [...r.data.questions, ...r.data.passages, ...r.data.words]) {
    if (seen.has(x.id)) {
      failed = true;
      console.error(`${file}: id ${x.id} also in ${seen.get(x.id)}`);
    }
    seen.set(x.id, file);
  }
  const by = (k: 'skill' | 'cefr') => Object.entries(Object.groupBy(r.data.questions, (q) => q[k])).map(([s, v]) => `${s}:${v!.length}`).join(' ');
  console.log(`${file}: ${r.data.questions.length} questions (${by('skill')} | ${by('cefr')}), ${r.data.passages.length} passages, ${r.data.words.length} words`);
}
process.exit(failed ? 1 : 0);
