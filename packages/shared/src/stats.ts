export type AttemptLite = { skill: string; topic: string; correct: boolean };
export type Accuracy = { correct: number; total: number; rate: number };

export function accuracyBy(attempts: AttemptLite[], key: 'skill' | 'topic'): Record<string, Accuracy> {
  const out: Record<string, Accuracy> = {};
  for (const a of attempts) {
    const k = a[key];
    const acc = (out[k] ??= { correct: 0, total: 0, rate: 0 });
    acc.total++;
    if (a.correct) acc.correct++;
    acc.rate = acc.correct / acc.total;
  }
  return out;
}

// Below this sample size we never label a topic weak (product-plan: no verdict from 2 answers).
export const MIN_ATTEMPTS_FOR_VERDICT = 8;
export const WEAK_THRESHOLD = 0.6;

export function weakTopics(attempts: AttemptLite[]): string[] {
  return Object.entries(accuracyBy(attempts, 'topic'))
    .filter(([, a]) => a.total >= MIN_ATTEMPTS_FOR_VERDICT && a.rate < WEAK_THRESHOLD)
    .sort((x, y) => x[1].rate - y[1].rate)
    .map(([t]) => t);
}
