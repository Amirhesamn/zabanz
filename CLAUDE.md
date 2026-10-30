# Zabanz (زبانز)

Persian-speaking learners practise English with 4-option questions (grammar, vocab, reading), Leitner 5-box vocab review, mistake notebook, stats. Source of truth: `GDD.html` (this folder). `../4gozine/product-plan-fa.html` is a secondary reference only (use it for the question-publish workflow and stats honesty rules).

## Decisions (final, 2026-10-30)
- Name: Zabanz. Model: Freemium. Core learning (practice, explanations, bookmarks, basic Leitner) stays free forever.
- Ads AND Zabanz Plus subscription are both in scope from the start (user-confirmed, GDD section 8 items 1 and 2).
  - Ads: rewarded (watch -> streak freeze, 2x XP, unlock one simulator exam); interstitial only after a finished lesson, at most once per 3 lessons, never mid-question. Iran networks: Tapsell / Adivery. AdMob only when Google Play ships.
  - Plus: no ads, full stats + full weakness map, unlimited simulator exams, full offline packs, AI explanation per question, unlimited streak freeze. Free tier: 1 freeze/week, base stats, offline packs for the current level only (default, change if wanted).
  - Therefore the timed simulator exam, weakness map and AI explanation are pulled from v1.1 into this build.
  - Design: `AdProvider` and `BillingProvider` interfaces with mock implementations in dev; Bazaar/Myket billing adapters for Iran. Entitlement (`plan`, `plan_expires_at`) is decided by the server only; the app caches it. AI explanation is an API endpoint behind a provider interface (must be reachable from Iran), gated by entitlement and rate limited.
- First market: Iran, Cafe Bazaar + Myket (Android). iOS and Google Play later.
- Level: CEFR A2–B1 for MVP. Seed: 200 sample questions written by Claude, all `status: "draft"` (unreviewed). Nothing is "published" without human review.
- Stack: Expo SDK 58 + TypeScript + Expo Router (mobile), expo-sqlite with plain SQL migrations in `apps/mobile/src/db` (no ORM, no state library; screens reload from SQLite on focus), Fastify + PostgreSQL (API), Directus on the same Postgres (content/admin panel). pnpm monorepo (hoisted). Add TanStack Query only when the API exists.
- Sanctions rule: the core app must not depend on Firebase, Supabase, EAS or Google Sign-In. Builds are local (`npx expo run:android`). OTP login goes through an Iranian SMS provider behind an interface; use a console/mock provider in dev.

## Layout
- `apps/mobile` Expo app (`src/app` routes, `src/db` SQLite, `src/services` ad/billing providers)
- `apps/api` Fastify API (content packs, sync, OTP), not built yet
- `packages/shared` zod schema + all product rules as pure TS (Leitner, mistakes, streak/freeze, XP, lesson mix, placement, stats, plans/ads). Business rules go here with a test, not in screens.
- `content` (`@zabanz/content`) seed packs in `content/seed/*.json`, bundled into the app
- `infra` docker-compose (postgres, directus), not built yet

## Commands
- `pnpm test` / `pnpm typecheck` from the root; `pnpm content:check` validates every seed pack
- `apps/mobile`: `npx expo lint`, `npx tsc --noEmit`, `npx expo install <pkg>` (never plain pnpm add for Expo libs)

## Conventions
- UI is RTL, question stem and options are LTR. Test both.
- Correct/wrong feedback always uses colour plus icon plus text. No hearts or lives. Touch targets at least 48px, dark theme, Vazirmatn font.
- Attempts are append-only with client-generated ids (idempotent sync). Bookmarks and SRS cards: last write wins.
- Question content comes from versioned JSON packs and is stored in SQLite. The app works fully offline as a guest.

## Build order
1. Monorepo, shared schema, seed questions, validator.
2. Mobile question screen working offline on 200 seed questions (first thing to touch).
3. Daily lesson, free practice, reading, bookmarks, mistake notebook.
4. Leitner boxes, stats, XP and streak, local notifications.
5. API + Directus, pack download, sync, OTP, placement test.
6. Timed simulator exam, weakness map, entitlement model + server check, Plus gating.
7. Ads (rewarded, interstitial) and Bazaar/Myket billing, each behind its provider interface; AI explanation endpoint.
8. Beta build for Bazaar/Myket.

## Testing
- `packages/shared`: unit tests (vitest) for the SRS engine, schema validation and lesson composition (60/20/20).
- `apps/api`: integration tests against the docker Postgres.
- Mobile: component tests for the question flow, plus manual run on an Android device/emulator for each milestone. Release gate is in the GDD and product-plan ("guest completes a session offline", "sync twice does not double stats").
