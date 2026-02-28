# MediTrack — AI Coding Guidelines

## Architecture

**Stack:** Expo SDK 55.0.4, React 19.2, React Native 0.83.2, Expo Router 55.0.3 (file-based routing), Supabase (auth + Postgres with RLS), TanStack Query v5 (server state), Zustand v5 (client draft state), TypeScript 5.9.3 strict mode, Bun package manager.

**Provider hierarchy** (defined in `app/_layout.tsx`):
`ThemePreferenceProvider` → `QueryClientProvider` → `ThemeProvider` → `AuthProvider` → `RootLayoutNav` + `<Toast />`

There is **no** `MedicationProvider`. Server state is managed via TanStack Query hooks; form draft state via Zustand stores.

**Routing:** Expo Router file-based routing under `app/`. Tabs live in `app/(tabs)/`. Medication flows are in `app/medication/`. Auth screens in `app/auth/`. Profile editing in `app/profile/`.

### Project Structure

```
lib/           — supabase client, queryClient singleton, queryKeys factory, notifications
types/         — database.ts (all Row/Draft/Update types + empty defaults)
stores/        — draftStores.ts (Zustand stores for medication & schedule drafts)
hooks/         — useQueryHooks.ts (all TanStack Query/mutation hooks), useThemeColors, useCalendar, useSnooze
contexts/      — AuthContext.tsx, ThemeContext.tsx (React Context — auth & theme only)
constants/     — days, icons, medications, schedule, reports, storage (barrel via index.ts)
utils/         — date, dose, calendar, report, adherence, snooze, notificationHelpers, string (barrel via index.ts)
components/ui/ — 20 shared components + theme.ts
app/           — screens (Expo Router file-based)
```

**Database (Supabase):** Four tables, all with RLS policies scoped to `auth.uid()`:
| Table | Purpose | Key columns |
|---|---|---|
| `medications` | Drug definitions | `id`, `user_id`, `name`, `dosage`, `form`, `icon`, `current_supply`, `low_supply_threshold`, `is_active` |
| `schedules` | When/how to take a medication | `id`, `medication_id` (FK), `user_id`, `frequency`, `selected_days[]`, `times_of_day[]`, `dosage_per_dose`, `push_notifications`, `sms_alerts`, `snooze_duration`, `instructions`, `start_date`, `end_date`, `is_active` |
| `dose_logs` | Dose tracking records | `id`, `schedule_id` (FK), `medication_id` (FK), `user_id`, `scheduled_date`, `time_label`, `status` (`'taken'`\|`'skipped'`), `logged_at`; unique on `(schedule_id, scheduled_date, time_label)` |
| `profiles` | User profile data | `id` (= `auth.uid()`), `full_name`, `age` |

DB columns use `snake_case`. TypeScript draft types use `camelCase`. Row types mirror the DB exactly in `snake_case`.

## State Management

### TanStack Query (server state)

All Supabase CRUD for `medications`, `schedules`, and `dose_logs` is encapsulated in hooks in `hooks/useQueryHooks.ts` (548 lines). Screens **never** call `supabase.from()` for these tables directly — they use the hooks.

**Query Client** (`lib/queryClient.ts`): singleton with `staleTime: 2min`, `gcTime: 10min`, `retry: 2` (queries) / `retry: 1` (mutations). App-focus refetch via `focusManager`.

**Query Keys** (`lib/queryKeys.ts`): centralised factory for cache invalidation:
```tsx
queryKeys.medications.all          // ['medications']
queryKeys.medications.detail(id)   // ['medications', id]
queryKeys.schedules.all            // ['schedules']
queryKeys.schedules.byMedication(id) // ['schedules', 'byMedication', id]
queryKeys.schedules.detail(id)     // ['schedules', 'detail', id]
queryKeys.doseLogs.byDate(date)    // ['doseLogs', 'byDate', date]
queryKeys.doseLogs.byRange(s, e)   // ['doseLogs', 'byRange', s, e]
queryKeys.profile.current          // ['profile']
```

**Available query hooks:**
| Hook | Returns | Purpose |
|---|---|---|
| `useMedications()` | `UseQueryResult<MedicationRow[]>` | All active medications |
| `useMedication(id)` | `UseQueryResult<MedicationRow>` | Single medication by ID |
| `useSchedules()` | `UseQueryResult<ScheduleRow[]>` | All active schedules |
| `useSchedulesByMedication(medId)` | `UseQueryResult<ScheduleRow[]>` | Schedules for one med |
| `useSchedule(id)` | `UseQueryResult<ScheduleRow>` | Single schedule by ID |
| `useDoseLogsByDate(date)` | `UseQueryResult<DoseLogRow[]>` | Logs for a single day |
| `useDoseLogsByRange(start, end)` | `UseQueryResult<DoseLogRow[]>` | Logs for a date range |

**Available mutation hooks:**
| Hook | Input | Invalidates |
|---|---|---|
| `useCreateMedication()` | Draft fields | `medications.all` |
| `useUpdateMedication()` | `{ id, updates }` | `medications.all`, `medications.detail` |
| `useDeleteMedication()` | medication ID | `medications.all`, `schedules.all` |
| `useAdjustSupply()` | `{ id, delta }` | `medications.all`, `medications.detail` |
| `useCreateSchedule()` | Draft + medId | `schedules.all`, `schedules.byMedication` |
| `useUpdateSchedule()` | `{ id, updates }` | `schedules.all`, `schedules.byMedication`, `schedules.detail` |
| `useDeleteSchedule()` | schedule ID | `schedules.all` |
| `useLogDose()` | dose log fields | `doseLogs` (all keys) |
| `useDeleteDoseLog()` | `{ scheduleId, date, timeLabel }` | `doseLogs` (all keys) |

All query hooks use `enabled: !!user?.id` guard. All mutations invalidate relevant caches in `onSuccess`.

**Usage pattern in screens:**

```tsx
import { useMedications, useCreateMedication } from '../../hooks/useQueryHooks';

export default function MyScreen() {
  const { data: medications = [], isLoading, error } = useMedications();
  const createMed = useCreateMedication();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={refetch} />;

  const handleSave = async () => {
    try {
      await createMed.mutateAsync({ name, dosage, /* ... */ });
      Toast.show({ type: 'success', text1: 'Saved!' });
      router.back();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message });
    }
  };
}
```

**Derived data pattern:** Tab screens use `useMemo` over query data for computed values instead of managing extra state:

```tsx
const { data: medications = [] } = useMedications();
const { data: schedules = [] } = useSchedules();
const { data: logs = [] } = useDoseLogsByDate(selectedISO);

const todayDoses = useMemo(
  () => buildTodayDoses(medications, schedules, logs, selectedISO),
  [medications, schedules, logs, selectedISO],
);
```

### Zustand (client draft state)

Form drafts for multi-step creation flows live in `stores/draftStores.ts`:

```tsx
import { useMedicationDraft } from '../../stores/draftStores';
import { useScheduleDraft } from '../../stores/draftStores';

// Medication draft store
const { draft, updateDraft, resetDraft } = useMedicationDraft();

// Schedule draft store
const { scheduleDraft, schedulingMedId, updateScheduleDraft, setSchedulingMedId, resetScheduleDraft } = useScheduleDraft();
```

**Draft vs Row:** Drafts are Zustand store state for multi-step creation flows. Rows are the DB response shape. When **editing** an existing entity, use local `useState` populated from query data — do NOT use the shared draft stores.

### React Context (auth & theme only)

Only two React Contexts remain:
- `AuthContext` (`contexts/AuthContext.tsx`) — Supabase auth listener, session, user, profile state, `signOut()`, `checkProfile()`. Access via `useAuth()`.
- `ThemeContext` (`contexts/ThemeContext.tsx`) — theme preference (`light | dark | system`) with AsyncStorage persistence. Access via `useThemePreference()`.

## Supabase Patterns

**Client:** Singleton in `lib/supabase.ts`, configured with `AsyncStorage` for session persistence. Uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` env vars.

**RLS:** Every table has row-level security enabled. All policies filter by `user_id = auth.uid()`. The app always includes `.eq('user_id', user.id)` in queries as a safety net — never omit this even though RLS is enforced server-side.

**Query conventions — always chain `.select()` after mutations to get the row back:**

```tsx
// INSERT — always .select().single() to get the created row
const { data, error } = await supabase
  .from('medications')
  .insert({ user_id: user.id, name: draft.name, /* ... */ })
  .select()
  .single();

// UPDATE — same pattern
const { data, error } = await supabase
  .from('schedules')
  .update(updates)
  .eq('id', id)
  .eq('user_id', user.id)
  .select()
  .single();

// UPSERT with conflict key (dose_logs)
const { data, error } = await supabase
  .from('dose_logs')
  .upsert(
    { schedule_id, medication_id, user_id, scheduled_date, time_label, status, logged_at },
    { onConflict: 'schedule_id,scheduled_date,time_label' },
  )
  .select()
  .single();

// SELECT list — always .order() for consistent UI
const { data, error } = await supabase
  .from('medications')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .order('created_at', { ascending: false });

// DELETE — no .select() needed
const { error } = await supabase
  .from('medications')
  .delete()
  .eq('id', id)
  .eq('user_id', user.id);
```

**Where Supabase calls live:**
- `medications`, `schedules`, `dose_logs` — all CRUD is in `hooks/useQueryHooks.ts`. Screens call the query/mutation hooks, never `supabase.from()` directly for these tables.
- `profiles` — queried directly in `AuthContext` (read) and `app/profile/edit.tsx` (update/delete). There is no dedicated hook for profiles.
- `auth` — `supabase.auth.*` calls live in `AuthContext` and auth screens (`app/auth/`).
- `_layout.tsx` — one-time direct Supabase call on app launch to re-register push notification reminders.

**Soft deletes:** `medications` and `schedules` use `is_active` boolean. Queries always filter `.eq('is_active', true)`. Hard deletes are used for `dose_logs` and `profiles`.

**Column mapping (Draft → DB):** When inserting/updating, manually map camelCase draft fields to snake_case DB columns. There is no auto-mapper:

```tsx
// Draft fields          →  DB columns
// draft.currentSupply   →  current_supply
// draft.lowSupplyThreshold → low_supply_threshold
// draft.timesOfDay      →  times_of_day
// draft.dosagePerDose   →  dosage_per_dose
```

## Theming Pattern (CRITICAL — follow in every file)

Every component and screen must support dark mode using this exact pattern:

```tsx
import { type ColorScheme, borderRadius, shadows } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

export default function MyScreen() {
  const c = useThemeColors();                    // 1. Get color scheme
  const styles = useMemo(() => makeStyles(c), [c]); // 2. Memoize styles
  // ... use styles and c throughout JSX
}

function makeStyles(c: ColorScheme) {            // 3. Define at bottom of file
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    card: { backgroundColor: c.card, ...shadows.sm, borderRadius: borderRadius.lg },
    title: { color: c.gray900 },
    subtitle: { color: c.gray500 },
    // ...
  });
}
```

**Rules:**
- Always name the theme variable `c` (convention used everywhere).
- Use `c.card` for card/surface backgrounds — never hardcode `#FFFFFF`.
- Use `c.white` only for text on gradient backgrounds.
- Import `borderRadius`, `shadows`, `gradients` from `components/ui/theme` — never hardcode these values.
- The `makeStyles(c)` function is always the last function in the file.

## Types

All database-related types live in `types/database.ts`:

| Type | Casing | Purpose |
|---|---|---|
| `MedicationDraft` | camelCase | Creation form state |
| `MedicationRow` | snake_case | DB response shape |
| `MedicationUpdate` | snake_case | Partial update payload |
| `ScheduleDraft` | camelCase | Creation form state (includes `startDate`, `endDate`) |
| `ScheduleRow` | snake_case | DB response shape |
| `ScheduleUpdate` | snake_case | Partial update payload |
| `DoseLogRow` | snake_case | DB response (read-only) |

Empty defaults `emptyMedicationDraft` and `emptyScheduleDraft` are also exported from `types/database.ts` and used by Zustand stores for reset.

Import types from `types/database` — not from hooks or stores:
```tsx
import type { MedicationRow, ScheduleRow, DoseLogRow } from '../../types/database';
```

## UI Flows (Decoupled)

**Add Medication:** `medication/add.tsx` — uses `useMedicationDraft` store + `useCreateMedication` mutation. Saves directly to `medications` table. No schedule step.

**Schedule a Medication:** FAB on Today tab → `medication/select.tsx` → `medication/schedule.tsx` → `medication/reminders.tsx` → `medication/review.tsx` → `medication/success.tsx`. Uses `useScheduleDraft` store (Zustand) + `useCreateSchedule` / `useUpdateSchedule` mutations.

**Edit Medication:** `medication/edit.tsx` — uses `useMedication(id)` query + `useUpdateMedication` mutation. Only edits medication fields (name, dosage, form, icon, supply). Does NOT touch schedules.

**Edit Schedule:** `medication/edit-schedule.tsx` — uses `useSchedule(id)` query + `useUpdateSchedule` mutation. Local `useState` initialized from query data once (not shared draft).

**Medication Detail:** `medication/[id].tsx` — uses `useMedication(id)` + `useSchedulesByMedication(id)` queries. Delete via `AlertDialog` + `useDeleteMedication` / `useDeleteSchedule` mutations.

## Component Conventions

**Icons:** Use `Feather` from `@expo/vector-icons` exclusively. Reference icons as `keyof typeof Feather.glyphMap`.

**Gradient headers:** Screens with hero headers use `LinearGradient` with `gradients.primary` (`['#1FA2A6', '#2563EB']`).

**Feedback states:** Use the trio `<LoadingState />`, `<ErrorState onRetry={...} />`, `<EmptyState variant="..." />` for async data screens. Use `isLoading` / `error` from query hooks to determine which to render.

**Shared UI components** (`components/ui/`): `AlertDialog`, `Button`, `CalendarSection`, `CustomTimeChips`, `DatePickerModal`, `DateRangeSection`, `DaySelector`, `EmptyState`, `ErrorState`, `Input`, `InventoryProgressBar`, `LoadingState`, `MedicationCard`, `NotificationCard`, `ProgressRing`, `SegmentedControl`, `Stepper`, `TimePickerModal`, `TimeSlotGrid`, `theme.ts`.

**AlertDialog:** Custom modal dialog. Supports `variant` (`destructive | info | warning | success`) and optional `icon` prop to override the variant default.

**MedicationCard:** Used in the Today tab. Supports `status` (`pending | taken | skipped`), action callbacks (`onTake`, `onSkip`, `onSnooze`), and `onUndo` for reverting completed doses.

**Toast:** Use `react-native-toast-message` for success/error feedback. Import `Toast` directly — it's mounted in the root layout.

## Optimistic Updates Pattern

Used in the Today tab (`app/(tabs)/index.tsx`) for dose logging:

1. Snapshot current state
2. Update UI immediately
3. Call mutation in background
4. On failure: revert to snapshot + show error Toast

## Constants & Utilities

**Constants** (`constants/`): Barrel-exported via `constants/index.ts`. Contains `days.ts` (weekday order), `icons.ts` (icon maps), `medications.ts` (form options), `schedule.ts` (frequency/snooze/preset options), `reports.ts` (report config), `storage.ts` (AsyncStorage keys).

**Utilities** (`utils/`): Barrel-exported via `utils/index.ts`. Pure functions — no side effects or Supabase calls:
- `date.ts` — `toISO`, `formatDateLabel`, `formatHourMinute`, `parseTimeToMinutes`, `getRelativeTime`
- `dose.ts` — `buildTodayDoses`, `resolveTimeSlot`, `TodayDose` type
- `calendar.ts` — `computeDayStatusMap`, `DayStatus` type
- `report.ts` — `buildReport`, `DayBar`, `MissedDose` types
- `adherence.ts` — `computeAdherence`, `computeStreak`
- `snooze.ts` — `parseSnoozeDuration`, `formatTimeLeft`
- `notificationHelpers.ts` — `describeTrigger`, `getNotificationIcon`, `buildScheduledItems`, `buildDeliveredItems`
- `string.ts` — `capitalize`

All utility files import types from `types/database.ts`.

## Custom Hooks

- `useThemeColors()` — returns the correct `ColorScheme` for current light/dark mode.
- `useCalendar()` — pure local state for calendar date navigation (week offsets, selected date).
- `useSnooze({ selectedISO, loadDoses, logDose, adjustSupply, handleStatusChange })` — manages snooze timers, AsyncStorage persistence, and push notification actions. Takes callback params to bridge with TanStack Query mutations.
- All TanStack Query hooks are in `hooks/useQueryHooks.ts` (listed above).

## Key Conventions

- **Package manager:** Bun (`bun install`, `bun run start`)
- **Navigation:** Use `router.push()` / `router.replace()` / `router.back()` from `expo-router`
- **Auth guard:** Handled automatically in `app/_layout.tsx` — redirects unauthenticated users to `/`, users without profiles to `/auth/profile-setup`
- **SMS Alerts:** Currently disabled with a "Coming Soon" badge. Do not implement SMS functionality.
- **State management:** TanStack Query v5 for server state, Zustand v5 for form drafts, React Context for auth + theme. No Redux or other state libraries.
- **Dev tooling:** `@dev-plugins/react-query` for TanStack Query devtools in Expo dev client. Initialized in `RootLayoutNav` with `useReactQueryDevTools(queryClient)`.
- **Notifications:** `expo-notifications` with custom snooze actions (`lib/notifications.ts`). Reminders are re-registered on app launch in `_layout.tsx`.
