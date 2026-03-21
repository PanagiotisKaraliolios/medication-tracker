# Changelog

## [1.4.0] - 2026-03-21

### Added
- **Tablet/iPad layout** — responsive side rail navigation, content max-width constraints, master-detail split on Medications tab, dose grid in landscape, orientation lock (portrait on phone, free rotation on tablet)
- **Drug search in Edit Medication** — DrugSearchInput autocomplete and drug interaction warnings, matching the Add Medication flow
- **PRN autocomplete dropdown** — replaced plain medication list with searchable autocomplete dropdown for faster PRN dose logging
- **FAB "Add Medication" action** — new speed dial entry to jump directly to the Add Medication screen
- **useResponsive hook** — centralised tablet/landscape detection for all screens
- **MedicationDetailPanel component** — extracted from medication detail screen for reuse in tablet master-detail split

### Fixed
- **FAB close animation artifacts** — backdrop now fades with action items instead of disappearing instantly; close uses timing animation to prevent spring overshoot
- **Optimistic dose updates** — refactored from full-array copy to overrides map for cleaner state management

### Changed
- Card styles use border-based styling instead of shadows for consistency across platforms
- Status bar style now adapts to current theme (light/dark)
- `app.json` orientation changed from `portrait` to `default`

---

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
