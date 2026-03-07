# Changelog

## [1.2.0] - 2026-03-07

### Added
- **Missed dose catch-up notifications** — if your phone was off at a scheduled time, you now get a reminder when you open the app
- **Exact alarm permissions** for Android 12+ to improve notification reliability after phone restarts
- **Ad Preferences screen** — toggle banners, interstitials, and app open ads individually from profile settings
- **Unified medication flow** — after adding a medication, a prompt offers to set up a schedule right away or skip for later
- **"Add New Medication" option** in the scheduling flow so you can create and schedule in one step
- **Collapsible banner ads** with retry logic and per-placement controls
- **Interstitial ad manager** with preloading and frequency capping
- **App Open ads** on return from background with frequency capping
- **UMP consent** integration for GDPR-compliant ad personalization

### Fixed
- **Stale data after account switch** — TanStack Query cache is now cleared on sign-out
- Removed duplicate FAB (floating action button) from the Medications tab to simplify navigation

### Changed
- Ad configuration centralized in `lib/ads.ts` with content rating set to G
