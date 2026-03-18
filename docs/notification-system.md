# MediTrack Notification System — Architecture

## Overview

The notification system manages three types of local notifications via `expo-notifications`:

| Type | Tag (`notifType`) | Purpose | Trigger |
|---|---|---|---|
| Medication Reminders | `reminder` | Remind user to take a dose | DAILY / WEEKLY / DATE |
| Low Supply Alerts | `low-supply` | Warn about low inventory | Immediate + Daily 9 AM |
| Snooze Expiry | `snooze` | Alert when snooze timer ends | TIME_INTERVAL |

## Architecture Diagram

```mermaid
graph TB
    subgraph ENTRY["Entry Points — What Triggers Scheduling"]
        APP_LAUNCH["🚀 App Launch<br/><i>_layout.tsx — syncReminders()</i><br/>remindersRegistered ref guard"]
        APP_FOREGROUND["📱 App Foreground<br/><i>_layout.tsx — AppState 'active'</i><br/>syncReminders() again"]
        CREATE_SCHED["➕ Create Schedule<br/><i>useCreateSchedule()</i><br/>hooks/useQueryHooks.ts"]
        UPDATE_SCHED["✏️ Update Schedule<br/><i>useUpdateSchedule()</i><br/>hooks/useQueryHooks.ts"]
        DELETE_SCHED["🗑️ Delete Schedule<br/><i>useDeleteSchedule()</i><br/>hooks/useQueryHooks.ts"]
        ADJUST_SUPPLY["💊 Log Dose / Adjust Supply<br/><i>useAdjustSupply()</i><br/>hooks/useQueryHooks.ts"]
        SNOOZE_ACTION["😴 User Snoozes Dose<br/><i>useSnooze()</i><br/>hooks/useSnooze.ts"]
        PULL_REFRESH["🔄 Pull to Refresh<br/><i>notifications.tsx</i><br/>onRefresh handler"]
    end

    subgraph LOCK["Serialization Lock"]
        MUTEX["withSchedulingLock()<br/><i>Promise-chain mutex</i><br/>Ensures sequential execution"]
    end

    subgraph SYNC["syncReminders() — Full Resync Flow"]
        direction TB
        FETCH_DB["Fetch from Supabase:<br/>• schedules (active)<br/>• medications (active)<br/>• dose_logs (today)"]
        RESCHED_ALL["rescheduleAllMedicationReminders()<br/><i>Loops all schedules</i>"]
        RECHECK_LOW["recheckAllLowSupplyReminders()<br/><i>Loops all medications</i><br/>fireImmediate = false"]
        FIRE_MISSED["fireMissedDoseReminders()<br/><i>Catch-up for missed doses</i>"]
        FETCH_DB --> RESCHED_ALL --> RECHECK_LOW --> FIRE_MISSED
    end

    subgraph SCHED_REM["scheduleMedicationReminders()"]
        direction TB
        CANCEL_MED_1["cancelMedicationReminders(scheduleId)"]
        CHECK_PUSH{"push_notifications<br/>enabled?"}
        LOOP_TIMES["Loop: times_of_day[]"]
        PARSE_TIME["parseTimeToHourMinute()"]
        FREQ{"frequency?"}
        DAILY_TRIG["DAILY trigger<br/>hour + minute"]
        WEEKLY_TRIG["WEEKLY trigger<br/>weekday + hour + minute<br/><i>One per selected_day</i>"]
        INTERVAL_TRIG["DATE trigger<br/><i>Next 7 occurrences</i>"]
        STORE_IDS["Store IDs → AsyncStorage<br/><i>notif_ids_{scheduleId}</i>"]

        CANCEL_MED_1 --> CHECK_PUSH
        CHECK_PUSH -->|No| STOP1["Return early"]
        CHECK_PUSH -->|Yes| LOOP_TIMES
        LOOP_TIMES --> PARSE_TIME --> FREQ
        FREQ -->|daily| DAILY_TRIG
        FREQ -->|weekly| WEEKLY_TRIG
        FREQ -->|interval| INTERVAL_TRIG
        DAILY_TRIG --> STORE_IDS
        WEEKLY_TRIG --> STORE_IDS
        INTERVAL_TRIG --> STORE_IDS
    end

    subgraph CANCEL_MED["cancelMedicationReminders(scheduleId)"]
        direction TB
        QUERY_OS_MED["Query OS: getAllScheduledNotificationsAsync()"]
        FILTER_MED["Filter: notifType='reminder'<br/>AND scheduleId matches"]
        CANCEL_MATCHED_MED["Cancel all matching IDs"]
        LEGACY_MED["Also cancel legacy AsyncStorage IDs<br/><i>Housekeeping for old ghosts</i>"]
        QUERY_OS_MED --> FILTER_MED --> CANCEL_MATCHED_MED --> LEGACY_MED
    end

    subgraph LOW_SUPPLY["scheduleLowSupplyReminder()"]
        direction TB
        CANCEL_LOW_1["cancelLowSupplyReminder(medicationId)"]
        CHECK_IMMEDIATE{"fireImmediate?"}
        FIRE_NOW["Immediate notification<br/><i>⚠️ Low Supply</i><br/>notifType='low-supply'"]
        DAILY_9AM["Daily 9:00 AM reminder<br/><i>⚠️ Low Supply</i><br/>notifType='low-supply'"]
        STORE_LOW_ID["Store ID → AsyncStorage<br/><i>low_supply_notif_{medId}</i>"]

        CANCEL_LOW_1 --> CHECK_IMMEDIATE
        CHECK_IMMEDIATE -->|Yes| FIRE_NOW --> DAILY_9AM
        CHECK_IMMEDIATE -->|No| DAILY_9AM
        DAILY_9AM --> STORE_LOW_ID
    end

    subgraph CANCEL_LOW["cancelLowSupplyReminder(medicationId)"]
        direction TB
        QUERY_OS_LOW["Query OS: getAllScheduledNotificationsAsync()"]
        FILTER_LOW["Filter: notifType='low-supply'<br/>AND medicationId matches"]
        CANCEL_SCHED_LOW["Cancel all matching scheduled"]
        QUERY_PRES["Query OS: getPresentedNotificationsAsync()"]
        DISMISS_PRES["Dismiss matching presented notifications"]
        LEGACY_LOW["Cancel legacy AsyncStorage ID<br/><i>Housekeeping</i>"]
        QUERY_OS_LOW --> FILTER_LOW --> CANCEL_SCHED_LOW
        CANCEL_SCHED_LOW --> QUERY_PRES --> DISMISS_PRES --> LEGACY_LOW
    end

    subgraph SNOOZE["Snooze Notification System"]
        direction TB
        SCHED_SNOOZE["scheduleSnoozeNotification()<br/><i>TIME_INTERVAL trigger</i><br/>notifType='snooze'"]
        CATEGORY["Notification Category:<br/>• 💊 Take Now<br/>• 😴 Snooze Again"]
        RESPONSE_LISTEN["addNotificationResponseListener()<br/><i>useSnooze hook</i>"]
        TAKE_ACTION["Take Now → logDose + adjustSupply"]
        SNOOZE_AGAIN_ACTION["Snooze Again → reschedule timer"]
        CANCEL_SNOOZE_FN["cancelSnoozeNotification(id)"]

        SCHED_SNOOZE --> CATEGORY
        CATEGORY --> RESPONSE_LISTEN
        RESPONSE_LISTEN --> TAKE_ACTION
        RESPONSE_LISTEN --> SNOOZE_AGAIN_ACTION
        SNOOZE_AGAIN_ACTION --> SCHED_SNOOZE
    end

    subgraph DEDUP["deduplicateScheduledNotifications()"]
        direction TB
        GET_ALL_DEDUP["Get all scheduled notifications"]
        GROUP_KEY["Group by:<br/>daily|title|hour:minute<br/>weekly|title|weekday|hour:minute"]
        KEEP_TAGGED["Keep notification with notifType tag<br/><i>From the fix</i>"]
        CANCEL_GHOSTS["Cancel all other duplicates"]
        GET_ALL_DEDUP --> GROUP_KEY --> KEEP_TAGGED --> CANCEL_GHOSTS
    end

    subgraph NOTIF_TYPES["notifType Discriminator Tags"]
        TAG_REM["'reminder'<br/>Medication reminders"]
        TAG_LOW["'low-supply'<br/>Low supply alerts"]
        TAG_SNOOZE["'snooze'<br/>Snooze expiry"]
    end

    %% Connections from entry points
    APP_LAUNCH --> SYNC
    APP_FOREGROUND --> SYNC
    CREATE_SCHED -->|await| MUTEX
    UPDATE_SCHED -->|await| MUTEX
    DELETE_SCHED --> CANCEL_MED
    ADJUST_SUPPLY -->|"supply ≤ threshold"| MUTEX
    ADJUST_SUPPLY -->|"supply > threshold"| MUTEX
    SNOOZE_ACTION --> SNOOZE
    PULL_REFRESH --> DEDUP

    %% Lock wraps core functions
    MUTEX --> SCHED_REM
    MUTEX --> LOW_SUPPLY
    SYNC -->|via lock| MUTEX

    %% Cancel function references
    SCHED_REM -.->|uses| CANCEL_MED
    LOW_SUPPLY -.->|uses| CANCEL_LOW

    %% Tags
    SCHED_REM -.->|tags| TAG_REM
    LOW_SUPPLY -.->|tags| TAG_LOW
    SNOOZE -.->|tags| TAG_SNOOZE
    CANCEL_MED -.->|filters by| TAG_REM
    CANCEL_LOW -.->|filters by| TAG_LOW

    %% Styling
    classDef entry fill:#2563EB,stroke:#1e40af,color:#fff
    classDef lock fill:#dc2626,stroke:#991b1b,color:#fff
    classDef cancel fill:#f59e0b,stroke:#d97706,color:#000
    classDef schedule fill:#1FA2A6,stroke:#0d7377,color:#fff
    classDef snooze fill:#8b5cf6,stroke:#6d28d9,color:#fff
    classDef dedup fill:#10b981,stroke:#059669,color:#fff
    classDef tag fill:#334155,stroke:#1e293b,color:#fff

    class APP_LAUNCH,APP_FOREGROUND,CREATE_SCHED,UPDATE_SCHED,DELETE_SCHED,ADJUST_SUPPLY,SNOOZE_ACTION,PULL_REFRESH entry
    class MUTEX lock
    class CANCEL_MED_1,CANCEL_LOW_1,CANCEL_MATCHED_MED,CANCEL_SCHED_LOW,DISMISS_PRES,LEGACY_MED,LEGACY_LOW,CANCEL_GHOSTS cancel
    class DAILY_TRIG,WEEKLY_TRIG,INTERVAL_TRIG,DAILY_9AM,FIRE_NOW,STORE_IDS,STORE_LOW_ID schedule
    class SCHED_SNOOZE,CATEGORY,RESPONSE_LISTEN,TAKE_ACTION,SNOOZE_AGAIN_ACTION,CANCEL_SNOOZE_FN snooze
    class GET_ALL_DEDUP,GROUP_KEY,KEEP_TAGGED dedup
    class TAG_REM,TAG_LOW,TAG_SNOOZE tag
```

## Key Files

| File | Role |
|---|---|
| `lib/notifications.ts` | Core scheduling, cancellation, deduplication, and permission logic |
| `app/_layout.tsx` | `syncReminders()` — full resync on launch and every foreground |
| `hooks/useQueryHooks.ts` | Mutation hooks that trigger scheduling (create/update schedule, adjust supply) |
| `hooks/useSnooze.ts` | Snooze timer management and notification action handling |
| `app/notifications.tsx` | Notification listing screen with pull-to-refresh deduplication |
| `utils/notificationHelpers.ts` | Display helpers — trigger descriptions, icons, grouping |
| `constants/storage.ts` | AsyncStorage key constants |

## Concurrency Safety

All scheduling and cancellation operations are serialized through `withSchedulingLock()` — a promise-chain mutex in `lib/notifications.ts`. This prevents race conditions between:

- Mutation hooks (e.g. `useCreateSchedule`) and foreground sync (`syncReminders`)
- Multiple rapid foreground/background cycles
- Concurrent supply adjustments

## Cancellation Strategy

Cancellation queries the **OS-level scheduled notifications** (`getAllScheduledNotificationsAsync()`) and filters by `notifType` + entity ID, rather than relying solely on AsyncStorage-stored notification IDs. This eliminates "ghost" notifications whose IDs were lost in race conditions. Legacy AsyncStorage entries are still cleaned up as housekeeping.

## Deduplication (Legacy Cleanup)

`deduplicateScheduledNotifications()` runs on pull-to-refresh in the Notifications screen. It groups notifications by trigger signature (`type|title|time`) and cancels duplicates, preferring the one tagged with `notifType`. This cleans up ghost notifications created before the fix was deployed.
