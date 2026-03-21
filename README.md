# 💊 MediTrack — Medication Tracker

A modern, full-featured medication tracking app built with **Expo** and **React Native**. Track medications, set smart reminders, monitor adherence, and stay on top of your health — all from your phone.

<p align="center">
  <img src="https://img.shields.io/badge/Expo-55.0.4-000020?logo=expo&logoColor=white" alt="Expo SDK 55" />
  <img src="https://img.shields.io/badge/React_Native-0.83.2-61DAFB?logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Auth_+_Postgres-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TanStack_Query-v5-FF4154?logo=reactquery&logoColor=white" alt="TanStack Query" />
</p>

---

## 📱 Screenshots

<p align="center">
  <picture>
    <img alt="Today Dashboard" src="assets/screenshots/today-tab.png" width="220" />
  </picture>
  &nbsp;&nbsp;
  <picture>
    <img alt="Medications List" src="assets/screenshots/medications-tab.png" width="220" />
  </picture>
  &nbsp;&nbsp;
  <picture>
    <img alt="Reports & Analytics" src="assets/screenshots/reports-tab.png" width="220" />
  </picture>
  &nbsp;&nbsp;
  <picture>
    <img alt="Profile" src="assets/screenshots/profile-tab.png" width="220" />
  </picture>
</p>

<p align="center">
  <em>Today Dashboard &nbsp;·&nbsp; Medications &nbsp;·&nbsp; Reports &nbsp;·&nbsp; Profile</em>
</p>

---

## ✨ Features

### 📋 Medication Management
- Add, edit, and archive medications with name, dosage, form, and custom icons
- Track current supply with visual progress bars and low-supply alerts
- Support for all common medication forms (tablet, capsule, liquid, injection, etc.)
- PRN (as-needed) medications — log doses on demand without a fixed schedule

### 💊 Drug Database & Interactions
- Search the RxNorm drug database with autocomplete
- Auto-fill medication name and generic name from search results
- Drug interaction checker — warns about potential interactions between your medications

### ⏰ Smart Scheduling
- Flexible frequency options — daily, specific days, or custom interval (every N days)
- Multiple time slots per day (Morning, Afternoon, Evening, Night, or custom times)
- Start and end date support for limited-duration medications
- Configurable snooze durations per schedule
- Unified flow: add a medication and schedule it in one step, or schedule later

### 🔔 Push Notifications & Reminders
- Per-schedule push notification toggles
- Snooze actions directly from notifications (Take Now / Snooze Again)
- Missed dose catch-up — get a reminder when you open the app after missing a scheduled time
- Low-supply reminders when inventory drops below threshold
- Exact alarm support on Android 12+ for reliable delivery after restarts
- Battery optimization exemption prompt for uninterrupted notifications
- All reminders auto-restored on app launch

### ✅ Dose Tracking
- One-tap dose logging: mark as taken or skipped
- Undo capability for accidental logs
- Optimistic UI updates — instant feedback, background sync
- Calendar view showing daily adherence status (complete / partial / missed)

### 📊 Reports & Analytics
- Weekly and monthly adherence charts
- Streak tracking — consecutive days with full adherence
- Per-medication missed-dose breakdown
- Visual bar charts with color-coded adherence levels

### 🩺 Symptom & Side Effect Tracking
- Log symptoms with severity (mild / moderate / severe) and optional notes
- Link symptoms to specific medications or log them independently
- Browse symptom history by date

### 👤 User Profile & Account
- Secure authentication via Supabase (email/password + Google Sign-In)
- Profile management (name, optional date of birth)
- At-a-glance stats: medication count, adherence rate, day streak
- Change password or set a password for OAuth-only accounts
- Privacy & Security settings with data export and account deletion

### 👨‍👩‍👧 Caregiver Sharing
- Share a plain-text medication summary with family or caregivers
- Choose a time period (7, 30, or 90 days)
- Summary includes adherence rate, streak, medications, schedules, and supply levels
- Shared via the system share sheet (messaging, email, etc.)

### ❓ Help & Support
- In-app FAQ with expandable answers
- Direct email link to support
- Privacy policy link

### 📡 Offline Support
- Network status monitoring with visual offline indicator
- Graceful handling when connectivity is lost

### 🌙 Dark Mode
- Full dark mode support across every screen and component
- System theme auto-detection
- Manual toggle in profile settings

### 📢 Ads (Support the Developer)
- Non-intrusive banner, interstitial, and app-open ads
- Granular per-screen ad controls in Ad Preferences
- UMP consent integration for GDPR compliance
- All ads can be toggled off individually

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Expo Router (Screens)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐   │
│  │  Today   │ │   Meds   │ │ Reports  │ │  Profile  │   │
│  └────┬─────┘ └─────┬────┘ └─────┬────┘ └───────┬───┘   │
│       │             │            │              │       │
│  ┌────▼─────────────▼────────────▼──────────────▼────┐  │
│  │              TanStack Query (Server State)        │  │
│  │     useMedications · useSchedules · useDoseLogs   │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │               Supabase (Postgres + RLS)           │  │
│  │     medications · schedules · dose_logs · profiles│  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Zustand      │  │ AuthContext  │  │ ThemeContext  │  │
│  │ (Form Drafts)│  │ (Auth+User)  │  │ (Dark Mode)   │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Expo SDK 55.0.4, React Native 0.83.2 | Cross-platform mobile |
| **Routing** | Expo Router 55.0.3 | File-based navigation |
| **Language** | TypeScript 5.9.3 (strict) | Type safety |
| **Server State** | TanStack Query v5 | Data fetching, caching, mutations |
| **Client State** | Zustand v5 | Form draft state for multi-step flows |
| **Auth & DB** | Supabase | Authentication, Postgres, Row-Level Security |
| **OAuth** | Google Sign-In | Social login via `@react-native-google-signin` |
| **Notifications** | expo-notifications | Push reminders with snooze actions |
| **Ads** | Google Mobile Ads | Banners, interstitials, app-open ads with UMP consent |
| **Networking** | NetInfo | Offline detection and connectivity monitoring |
| **UI** | React Native + custom components | 25 shared UI components |
| **Theming** | Custom theme system | Light/dark mode with system detection |
| **Package Manager** | Bun | Fast installs and scripts |

### Project Structure

```
medication-tracker/
├── app/                          # Screens (Expo Router file-based routing)
│   ├── _layout.tsx               # Root layout — provider hierarchy
│   ├── index.tsx                 # Welcome / landing screen
│   ├── (tabs)/                   # Tab navigator
│   │   ├── index.tsx             # Today dashboard
│   │   ├── medications.tsx       # Medications list
│   │   ├── reports.tsx           # Reports & analytics
│   │   └── profile.tsx          # User profile & settings menu
│   ├── auth/                     # Authentication screens
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── profile-setup.tsx
│   ├── medication/               # Medication & scheduling flows
│   │   ├── add.tsx               # Add new medication
│   │   ├── [id].tsx              # Medication detail
│   │   ├── edit.tsx              # Edit medication
│   │   ├── edit-schedule.tsx     # Edit existing schedule
│   │   ├── log-prn.tsx           # Log a PRN (as-needed) dose
│   │   ├── select.tsx            # Select medication to schedule
│   │   ├── schedule.tsx          # Set schedule details
│   │   ├── reminders.tsx         # Configure reminders
│   │   ├── review.tsx            # Review before saving
│   │   └── success.tsx           # Confirmation screen
│   ├── profile/
│   │   └── edit.tsx              # Edit user profile
│   ├── ad-preferences.tsx        # Ad type toggles
│   ├── caregiver-sharing.tsx     # Share medication summary
│   ├── change-password.tsx       # Change password
│   ├── google-callback.tsx       # Google OAuth deep-link handler
│   ├── help-support.tsx          # FAQ & contact
│   ├── log-symptom.tsx           # Log a new symptom
│   ├── notification-settings.tsx # Notification & battery settings
│   ├── notifications.tsx         # Notification history
│   ├── privacy-security.tsx      # Data export, account deletion
│   ├── set-password.tsx          # Set password for OAuth accounts
│   ├── support-developer.tsx     # Ad gallery to support dev
│   └── symptoms.tsx              # Symptom history browser
├── components/ui/                # 25 shared UI components + theme
├── hooks/                        # Custom hooks (queries, theme, calendar, snooze, ads, network)
├── lib/                          # Supabase client, query client, notifications, ads
├── stores/                       # Zustand stores (drafts, ad preferences)
├── types/                        # TypeScript types (database Row/Draft/Update)
├── constants/                    # App constants (days, icons, medications, etc.)
└── utils/                        # Pure utility functions (date, dose, reports, etc.)
```

---

## 🗄️ Database Schema

Seven tables with Row-Level Security (RLS) — every query is scoped to the authenticated user.
The five core tables are listed below; two legacy tables (`inventory`, `adherence_logs`) also exist but are unused.
The full schema is defined in [`supabase/migrations/00000000000000_initial.sql`](supabase/migrations/00000000000000_initial.sql).

```sql
── medications ─────────────────────────────────────────
 id              UUID  PK
 user_id         UUID  FK → auth.users
 name            TEXT
 dosage          TEXT
 form            TEXT        -- tablet, capsule, liquid, etc.
 icon            TEXT
 current_supply  INTEGER
 low_supply_threshold INTEGER
 is_prn          BOOLEAN     -- true = "as needed" (no fixed schedule)
 rxcui           TEXT        -- RxNorm concept ID (optional, from drug search)
 generic_name    TEXT        -- generic drug name (optional, from drug search)
 is_active       BOOLEAN     -- soft delete
 created_at      TIMESTAMPTZ
 updated_at      TIMESTAMPTZ

── schedules ───────────────────────────────────────────
 id              UUID  PK
 medication_id   UUID  FK → medications
 user_id         UUID  FK → auth.users
 frequency       TEXT        -- Daily, Specific Days, Interval
 selected_days   TEXT[]      -- ['Mon', 'Wed', 'Fri']
 times_of_day    TEXT[]      -- ['Morning', 'Evening']
 interval_days   INTEGER     -- every N days (nullable, for interval frequency)
 dosage_per_dose INTEGER
 push_notifications BOOLEAN
 sms_alerts      BOOLEAN
 snooze_duration TEXT        -- '5 min', '15 min', etc.
 instructions    TEXT
 start_date      DATE
 end_date        DATE        -- NULL = continue forever
 is_active       BOOLEAN     -- soft delete
 created_at      TIMESTAMPTZ
 updated_at      TIMESTAMPTZ

── dose_logs ───────────────────────────────────────────
 id              UUID  PK
 schedule_id     UUID  FK → schedules  (NULL for PRN doses)
 medication_id   UUID  FK → medications
 user_id         UUID  FK → auth.users
 scheduled_date  DATE
 time_label      TEXT        -- 'Morning', '08:30', etc.
 status          TEXT        -- 'taken' | 'skipped'
 reason          TEXT        -- optional reason (PRN doses)
 logged_at       TIMESTAMPTZ
 created_at      TIMESTAMPTZ
 UNIQUE (schedule_id, scheduled_date, time_label)

── symptoms ────────────────────────────────────────────
 id              UUID  PK
 user_id         UUID  FK → auth.users
 medication_id   UUID  FK → medications  (NULL if unlinked)
 name            TEXT        -- e.g. 'Headache', 'Nausea'
 severity        TEXT        -- 'mild' | 'moderate' | 'severe'
 notes           TEXT
 logged_at       TIMESTAMPTZ
 logged_date     DATE
 created_at      TIMESTAMPTZ

── profiles ────────────────────────────────────────────
 id              UUID  PK  = auth.uid()
 full_name       TEXT
 age             INTEGER     -- optional
 date_of_birth   DATE        -- optional
 updated_at      TIMESTAMPTZ
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (for Expo CLI)
- [Bun](https://bun.sh/) (package manager)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo Go](https://expo.dev/go) app on your device **or** a [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- A [Supabase](https://supabase.com/) project (free tier works)
- *(Optional)* A [Google Cloud](https://console.cloud.google.com/) project for Google Sign-In
- *(Optional)* An [AdMob](https://admob.google.com/) account for ads

### 1. Clone the repository

```bash
git clone https://github.com/PanagiotisKaraliolios/medication-tracker.git
cd medication-tracker
```

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-public-key
```

> Get these from your Supabase project dashboard → Settings → API.

### 4. Set up the database

Run [`supabase/migrations/00000000000000_initial.sql`](supabase/migrations/00000000000000_initial.sql) in the Supabase SQL Editor (Dashboard → SQL Editor → New Query). This single migration creates all tables, indexes, and RLS policies.

### 5. Configure Google Sign-In *(optional)*

1. Create an OAuth 2.0 Web Client ID in Google Cloud Console
2. Add the web client ID to your Supabase project (Authentication → Providers → Google)
3. Update `webClientId` in `hooks/useGoogleAuth.ts`

### 6. Configure Ads *(optional)*

1. Create an AdMob account and register your app
2. Update the ad unit IDs in `lib/ads.ts`
3. Add your AdMob app ID to `app.json` under the `react-native-google-mobile-ads` plugin

### 7. Start the development server

```bash
bun run start
```

Scan the QR code with Expo Go, or press:
- `a` — open on Android emulator
- `i` — open on iOS simulator
- `w` — open in web browser

### Building for device

For push notifications, Google Sign-In, ads, and full native functionality, create a development build:

```bash
bun run prebuild
bun run android   # or: bun run ios
```

---

## 📁 Key Files Reference

| File | Purpose |
|---|---|
| `hooks/useQueryHooks.ts` | All TanStack Query/mutation hooks |
| `hooks/useGoogleAuth.ts` | Google Sign-In integration hook |
| `hooks/useNetworkStatus.ts` | Online/offline connectivity monitoring |
| `hooks/useDrugSearch.ts` | RxNorm drug database search with debounce |
| `hooks/useAppOpenAd.ts` | App-open ad loading and display |
| `hooks/useBatteryOptimization.ts` | Android battery optimization exemption prompt |
| `stores/draftStores.ts` | Zustand stores for medication & schedule drafts |
| `stores/adPreferencesStore.ts` | Zustand store for per-screen ad toggles |
| `lib/queryClient.ts` | Query client singleton (staleTime, gcTime, focus) |
| `lib/queryKeys.ts` | Centralised query key factory for cache invalidation |
| `lib/notifications.ts` | Push notification scheduling, snooze actions, low-supply alerts |
| `lib/ads.ts` | Ad unit IDs and configuration |
| `lib/interstitialManager.ts` | Interstitial ad preloading and frequency capping |
| `lib/supabase.ts` | Supabase client singleton |
| `types/database.ts` | All TypeScript types (Row, Draft, Update) + empty defaults |
| `contexts/AuthContext.tsx` | Auth state, session management, profile loading |
| `contexts/ThemeContext.tsx` | Theme preference with AsyncStorage persistence |
| `components/ui/theme.ts` | Color schemes, gradients, shadows, border radii |

---

## 🧩 State Management

| Concern | Solution | Location |
|---|---|---|
| **Server data** (medications, schedules, dose logs) | TanStack Query v5 | `hooks/useQueryHooks.ts` |
| **Form drafts** (multi-step creation flows) | Zustand v5 | `stores/draftStores.ts` |
| **Ad preferences** (per-screen ad toggles) | Zustand v5 | `stores/adPreferencesStore.ts` |
| **Authentication** (session, user, profile) | React Context | `contexts/AuthContext.tsx` |
| **Theme** (light / dark / system) | React Context | `contexts/ThemeContext.tsx` |

> There is no `MedicationContext` or Redux. Screens consume data exclusively through TanStack Query hooks and never call `supabase.from()` directly for medications, schedules, or dose logs.

---

## 🎨 Theming

Every component supports light and dark mode:

```tsx
const c = useThemeColors();                        // Get current color scheme
const styles = useMemo(() => makeStyles(c), [c]);  // Memoize styles

// At bottom of file:
function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    card: { backgroundColor: c.card, ...shadows.sm, borderRadius: borderRadius.lg },
  });
}
```

---

## 📜 Scripts

| Command | Description |
|---|---|
| `bun run start` | Start Expo dev server |
| `bun run start:tunnel` | Start with tunnel (for physical devices on different networks) |
| `bun run prebuild` | Generate native projects (clean) |
| `bun run android` | Prebuild + run on Android |
| `bun run ios` | Prebuild + run on iOS |
| `bun run web` | Start for web |
| `bun run typecheck` | Run TypeScript type checking |

---

## 🛠️ Built With

- [Expo](https://expo.dev/) — Universal React framework
- [React Native](https://reactnative.dev/) — Cross-platform mobile UI
- [Expo Router](https://docs.expo.dev/router/introduction/) — File-based routing
- [Supabase](https://supabase.com/) — Auth, Postgres, Row-Level Security
- [TanStack Query](https://tanstack.com/query) — Server state management
- [Zustand](https://zustand-demo.pmnd.rs/) — Lightweight client state
- [Google Sign-In](https://github.com/react-native-google-signin/google-signin) — OAuth authentication
- [Google Mobile Ads](https://docs.page/invertase/react-native-google-mobile-ads) — Ad monetization with UMP consent
- [NetInfo](https://github.com/react-native-netinfo/react-native-netinfo) — Network connectivity monitoring
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) — Push notifications
- [expo-linear-gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/) — Gradient UI elements
- [expo-system-ui](https://docs.expo.dev/versions/latest/sdk/system-ui/) — System UI style (light/dark) support
- [react-native-toast-message](https://github.com/calintamas/react-native-toast-message) — Toast notifications
- [react-native-autocomplete-dropdown](https://github.com/onmotion/react-native-autocomplete-dropdown) — Drug search autocomplete

---

## 📄 License

This project is private and not licensed for public use.

---

<p align="center">
  Made with ❤️ using Expo & React Native
</p>
