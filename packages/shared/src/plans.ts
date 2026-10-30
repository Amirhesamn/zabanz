// Entitlement rules shared by app and API. The server is the source of truth for `plan`;
// the app only caches it and uses these helpers to decide what to show.
export type Entitlement = { plan: 'free' | 'plus'; expiresAt: string | null };

export const FREE: Entitlement = { plan: 'free', expiresAt: null };

export const isPlus = (e: Entitlement, now: Date = new Date()) =>
  e.plan === 'plus' && e.expiresAt !== null && new Date(e.expiresAt) > now;

export function features(plus: boolean) {
  return {
    ads: !plus,
    fullStats: plus,
    weaknessMap: plus,
    unlimitedSimulator: plus,
    allOfflinePacks: plus,
    aiExplanation: plus,
    unlimitedFreeze: plus,
  };
}

export const FREE_FREEZES_PER_WEEK = 1;

// Interstitials: only after a finished lesson, at most once per 3 lessons, never for Plus.
export const LESSONS_PER_INTERSTITIAL = 3;
export const shouldShowInterstitial = (plus: boolean, lessonsSinceLastAd: number) =>
  !plus && lessonsSinceLastAd >= LESSONS_PER_INTERSTITIAL;

export const REWARDS = ['streak_freeze', 'double_xp', 'simulator_unlock'] as const;
export type Reward = (typeof REWARDS)[number];
