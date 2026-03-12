# Changelog

## [1.3.0] - 2026-03-13

### Added
- **Interval-based scheduling** — schedule medications every N days, not just daily or weekly
- **Caregiver Sharing screen** — share a plain-text medication summary (adherence, streak, medications, schedules, supply) with family or caregivers via the system share sheet; choose 7, 30, or 90-day period
- **Help & Support screen** — in-app FAQ with expandable answers, direct email to support, and privacy policy link
- **Date of birth** replaces age in user profile (optional field with a 3-step year → month → day picker)
- **Cross-device notification sync** — reminders are re-synced when the app returns to the foreground
- **Date info on notification cards** — upcoming and delivered notification cards now show trigger dates
- **Stale notification cleanup** — all scheduled notifications are cancelled on sign-out and account deletion

### Changed
- **DatePickerModal UX overhaul** — redesigned with a 3-step flow (year → month → day) for faster date selection
- **Locale-aware date display** — profile screens now use the device locale instead of hardcoded US format
- **README** updated to reflect all current features, screens, schema changes, and new dependencies

---

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
