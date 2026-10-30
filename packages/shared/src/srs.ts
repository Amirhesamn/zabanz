import { addDays, type Day } from './dates';

// Leitner 5-box (G5). The UI shows boxes; replace `review` with FSRS later without touching callers.
export const BOX_INTERVAL_DAYS = [1, 2, 4, 8, 16] as const;
export const LEARNED = 6;

export type Card = { box: number; due: Day | null; lapses: number };

export const newCard = (today: Day): Card => ({ box: 1, due: today, lapses: 0 });

export function review(card: Card, remembered: boolean, today: Day): Card {
  if (!remembered) return { box: 1, due: addDays(today, BOX_INTERVAL_DAYS[0]), lapses: card.lapses + 1 };
  if (card.box >= 5) return { ...card, box: LEARNED, due: null };
  const box = card.box + 1;
  return { ...card, box, due: addDays(today, BOX_INTERVAL_DAYS[box - 1]!) };
}

// Overdue cards stay due; they are never dropped.
export const isDue = (card: Card, today: Day) => card.due !== null && card.due <= today;
