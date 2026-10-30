// A Day is a local calendar date 'YYYY-MM-DD'. Scheduling works on days, not timestamps,
// so "due tomorrow" means the user's tomorrow regardless of time zone or hour answered.
export type Day = string;

export function toDay(d: Date = new Date()): Day {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const utc = (day: Day) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
};

export function addDays(day: Day, n: number): Day {
  return new Date(utc(day) + n * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(from: Day, to: Day): number {
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}
