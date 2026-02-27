# MediTrack — AI Coding Guidelines

## Architecture

**Stack:** Expo SDK 54, React Native 0.81.5, Expo Router 6 (file-based routing), Supabase (auth + Postgres with RLS), TypeScript strict mode, Bun package manager.

**Provider hierarchy** (defined in `app/_layout.tsx`):
`ThemePreferenceProvider` → `ThemeProvider` → `AuthProvider` → `MedicationProvider` → screens + `<Toast />`

**Routing:** Expo Router file-based routing under `app/`. Tabs live in `app/(tabs)/`. Medication flows are in `app/medication/`. Auth screens in `app/auth/`. Profile editing in `app/profile/`.

**Database (Supabase):** Four tables, all with RLS policies scoped to `auth.uid()`:
| Table | Purpose | Key columns |
|---|---|---|
| `medications` | Drug definitions | `id`, `user_id`, `name`, `dosage`, `form`, `icon`, `current_supply`, `low_supply_threshold`, `is_active` |
| `schedules` | When/how to take a medication | `id`, `medication_id` (FK), `user_id`, `frequency`, `selected_days[]`, `times_of_day[]`, `dosage_per_dose`, `push_notifications`, `sms_alerts`, `snooze_duration`, `instructions`, `is_active` |
| `dose_logs` | Dose tracking records | `id`, `schedule_id` (FK), `medication_id` (FK), `user_id`, `scheduled_date`, `time_label`, `status` (`'taken'`\|`'skipped'`), `logged_at`; unique on `(schedule_id, scheduled_date, time_label)` |
| `profiles` | User profile data | `id` (= `auth.uid()`), `full_name`, `age` |

DB columns use `snake_case`. TypeScript draft types use `camelCase`. Row types mirror the DB exactly in `snake_case`.

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
- `medications`, `schedules`, `dose_logs` — all CRUD goes through `MedicationContext` (`contexts/MedicationContext.tsx`). Screens never call `supabase.from()` for these tables.
- `profiles` — queried directly in `AuthContext` (read) and `app/profile/edit.tsx` (update/delete). There is no dedicated context for profiles.
- `auth` — `supabase.auth.*` calls live in `AuthContext` and auth screens (`app/auth/`).

**Parallel fetching:** When a screen needs multiple tables, use `Promise.all`:

```tsx
const [medsRes, schRes, logsRes] = await Promise.all([
  fetchMedications(),
  fetchAllSchedules(),
  fetchDoseLogsForDate(todayISO),
]);
const firstError = medsRes.error ?? schRes.error ?? logsRes.error;
```

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

## Context & Data Flow

All data operations go through `MedicationContext` (`contexts/MedicationContext.tsx`). Access via `useMedication()` hook.

**Type hierarchy per entity:**
- `MedicationDraft` (camelCase, for creation forms) → `MedicationRow` (snake_case, from DB) → `MedicationUpdate` (snake_case, partial for edits)
- `ScheduleDraft` → `ScheduleRow` → `ScheduleUpdate`
- `DoseLogRow` (read-only from DB)

**Draft vs Row:** Drafts are shared context state for multi-step creation flows. Rows are the DB response shape. When editing, use local `useState` — do NOT use the shared draft.

**CRUD return pattern:** Every async method returns `{ data, error }` or `{ error }`. Always check `error` before using `data`.

```tsx
const { error } = await saveMedication();
if (error) {
  Toast.show({ type: 'error', text1: 'Error', text2: error });
  return;
}
Toast.show({ type: 'success', text1: 'Saved!' });
```

## UI Flows (Decoupled)

**Add Medication:** `medication/add.tsx` — saves directly to `medications` table. No schedule step.

**Schedule a Medication:** FAB on Today tab → `medication/select.tsx` → `medication/schedule.tsx` → `medication/reminders.tsx` → `medication/review.tsx` → `medication/success.tsx`. Uses `scheduleDraft` + `schedulingMedId` from context.

**Edit Medication:** `medication/edit.tsx` — only edits medication fields (name, dosage, form, icon, supply). Does NOT touch schedules.

**Medication Detail:** `medication/[id].tsx` — shows medication + its schedule. Delete via `AlertDialog`.

## Component Conventions

**Icons:** Use `Feather` from `@expo/vector-icons` exclusively. Reference icons as `keyof typeof Feather.glyphMap`.

**Gradient headers:** Screens with hero headers use `LinearGradient` with `gradients.primary` (`['#1FA2A6', '#2563EB']`).

**Feedback states:** Use the trio `<LoadingState />`, `<ErrorState onRetry={...} />`, `<EmptyState variant="..." />` for async data screens.

**AlertDialog:** Custom modal dialog (`components/ui/AlertDialog.tsx`). Supports `variant` (`destructive | info | warning | success`) and optional `icon` prop to override the variant default.

**MedicationCard:** Used in the Today tab. Supports `status` (`pending | taken | skipped`), action callbacks (`onTake`, `onSkip`, `onSnooze`), and `onUndo` for reverting completed doses.

**Toast:** Use `react-native-toast-message` for success/error feedback. Import `Toast` directly — it's mounted in the root layout.

## Optimistic Updates Pattern

Used in the Today tab (`app/(tabs)/index.tsx`) for dose logging:

1. Snapshot current state
2. Update UI immediately
3. Call Supabase in background
4. On failure: revert to snapshot + show error Toast

## Key Conventions

- **Package manager:** Bun (`bun install`, `bun run start`)
- **Navigation:** Use `router.push()` / `router.replace()` / `router.back()` from `expo-router`
- **Auth guard:** Handled automatically in `app/_layout.tsx` — redirects unauthenticated users to `/`, users without profiles to `/auth/profile-setup`
- **SMS Alerts:** Currently disabled with a "Coming Soon" badge. Do not implement SMS functionality.
- **No external state management:** All state is React context + local `useState`. No Redux, Zustand, etc.
