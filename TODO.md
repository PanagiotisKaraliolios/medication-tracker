# MediTrack — Engineering Improvement Plan

Prioritized action items for production readiness. Updated to reflect current project state.

---

## Status Legend

| Icon | Meaning |
|------|---------|
| ✅ | Done |
| 🔨 | In progress |
| 🔲 | Not started |
| ⏭️ | Skipped / Deferred |

---

## Tier 1: Critical (Health App Essentials)

| # | Action | Status | Notes |
|---|--------|--------|-------|
| 1 | **Test infrastructure & coverage** | ✅ | 936 tests across 42 suites (Node + Web). Jest config with 90% coverage thresholds. Covers utils, hooks, contexts, lib modules. |
| 2 | **Accessibility audit & fixes** | 🔲 | Health apps serve users with vision/motor impairments. Audit `accessibilityRole`, `accessibilityLabel`, form inputs, touch targets. Apple/Google can reject for this. |
| 3 | **App Store review readiness** | 🔲 | Health apps face stricter review. Check: permissions justifications (notifications, camera), privacy declarations, content ratings, health disclaimer. |

---

## Tier 2: High Priority (Production Readiness)

| # | Action | Status | Notes |
|---|--------|--------|-------|
| 4 | **Linting & formatting (Biome + Husky)** | ✅ | Biome configured (`biome.json`), Husky pre-commit hooks + commitlint set up. Formatting applied project-wide. |
| 5 | **Lint warnings cleanup** | 🔨 | Biome reports ~45 warnings: `noExplicitAny` (~16), `noNonNullAssertion` (~15), `noArrayIndexKey` (~7), `useExhaustiveDependencies` (~4), `noUnusedVariables` (~3). Currently fixing. |
| 6 | **Crash reporting (Sentry)** | 🔲 | No crash reporting. Blind to production errors. Critical for a health app — missed doses from crashes have real consequences. Use `@sentry/react-native` with Expo plugin. |
| 7 | **Error boundaries** | ✅ | `ErrorBoundaryWrapper` in `components/ui/ErrorBoundary.tsx`, wrapping the app in `_layout.tsx`. Provides crash recovery UI. |

---

## Tier 3: Quality & Maintainability

| # | Action | Status | Notes |
|---|--------|--------|-------|
| 8 | **Supabase/Postgres optimization** | 🔲 | Review: RLS policy efficiency, indexing on `user_id` + date columns, GIN indexes for array columns (`selected_days[]`, `times_of_day[]`), query explain plans. |
| 9 | **React Native performance audit** | 🔲 | Check: FlatList vs FlashList, memoization correctness, re-render profiling, bundle size analysis, image optimization, animation jank. |
| 10 | **`.editorconfig`** | ✅ | Already in place. |
| 11 | **Architecture documentation** | ✅ | `copilot-instructions.md` is comprehensive. `README.md` updated with full project docs. |

---

## Tier 4: Nice-to-Have

| # | Action | Status | Notes |
|---|--------|--------|-------|
| 12 | **Conventional commits** | ✅ | Husky + commitlint configured. Commits follow conventional format. |
| 13 | **Security hardening review** | 🔲 | Current security is solid (RLS, parameterized queries, session cleanup). Could add: input length limits, rate limiting awareness, certificate pinning for production. |
| 14 | **CI/CD pipeline** | 🔲 | GitHub Actions for: lint, typecheck, test, EAS build, submission. Currently manual. |

---

## Revised Priority Order

Based on current state (tests ✅, linting ✅, error boundaries ✅, hooks ✅), the remaining work in priority order:

### Immediate (do now)
1. **Finish lint warning cleanup** — 🔨 in progress, ~45 warnings remaining
2. **Crash reporting (Sentry)** — blind to production errors, fast to add with `sentry-expo`

### Before App Store submission
3. **Accessibility audit** — review all interactive elements for roles, labels, contrast, touch targets
4. **App Store review prep** — permissions strings, privacy manifest, health disclaimers
5. **CI/CD pipeline** — automate lint + typecheck + test on every push

### Post-launch optimization
6. **Supabase optimization** — add indexes, review RLS performance
7. **RN performance audit** — profiling, list optimization, bundle analysis
8. **Security hardening** — input limits, certificate pinning

---

*Last updated: March 23, 2026*
