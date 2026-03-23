import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Constants ────────────────────────────────────────────────────────

/** Notification category identifier for snooze‐expiry notifications */
export const SNOOZE_CATEGORY = 'snooze-actions';

/** AsyncStorage key prefix for scheduled reminder IDs per schedule */
const NOTIF_IDS_PREFIX = 'notif_ids_';

/** Map preset time labels to their display times */
const PRESET_TIME_MAP: Record<string, { hour: number; minute: number }> = {
  Morning: { hour: 8, minute: 0 },
  Afternoon: { hour: 12, minute: 0 },
  Evening: { hour: 18, minute: 0 },
  Night: { hour: 22, minute: 0 },
};

/** Map short day names → expo-notifications weekday (1 = Sun … 7 = Sat) */
const DAY_TO_WEEKDAY: Record<string, number> = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7,
};

/** Action identifiers the user can tap in the notification */
export const SNOOZE_ACTION_TAKE = 'take';
export const SNOOZE_ACTION_SNOOZE_AGAIN = 'snooze-again';

/** Shape of the data payload attached to every snooze notification */
export type SnoozeNotificationData = {
  doseKey: string;
  medicationId: string;
  scheduleId: string | null;
  medicationName: string;
  snoozeDuration: string; // e.g. '5 min'
  timeLabel: string;
  dosagePerDose?: number; // for inventory adjustment on "Take Now" action
};

// ── Notification category (action buttons) ───────────────────────────

/** Promise that resolves once the snooze category is registered with the OS. */
let categoryReady: Promise<void> | null = null;

/**
 * Register the notification action buttons with the OS.
 * Safe to call multiple times — only the first call does work.
 */
function ensureCategoryRegistered(): Promise<void> {
  if (!categoryReady) {
    categoryReady = Notifications.setNotificationCategoryAsync(SNOOZE_CATEGORY, [
      {
        identifier: SNOOZE_ACTION_TAKE,
        buttonTitle: '💊 Take Now',
        options: { opensAppToForeground: true },
      },
      {
        identifier: SNOOZE_ACTION_SNOOZE_AGAIN,
        buttonTitle: '😴 Snooze Again',
        options: { opensAppToForeground: true },
      },
    ])
      .then(() => {
        console.log('[Notifications] Category registered:', SNOOZE_CATEGORY);
      })
      .catch((err) => {
        console.warn('[Notifications] Failed to register category:', err);
        categoryReady = null; // allow retry on next call
      });
  }
  return categoryReady;
}

// ── Configure notification behaviour (foreground) ────────────────────
// This must be called as early as possible — imported from app/_layout.tsx.

export function registerNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Fire-and-forget: register channels + category at startup
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('snooze', {
      name: 'Snooze Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      vibrationPattern: [0, 250, 250, 250],
    }).catch((err) => console.warn('[Notifications] Snooze channel setup failed:', err));

    Notifications.setNotificationChannelAsync('medication-reminders', {
      name: 'Medication Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      vibrationPattern: [0, 250, 250, 250],
    }).catch((err) => console.warn('[Notifications] Reminders channel setup failed:', err));
  }
  ensureCategoryRegistered();
}

// ── Permissions ──────────────────────────────────────────────────────

/**
 * Request local‐notification permissions (required on iOS; implicit on Android).
 * Returns `true` if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Ensure channel + category are ready (no-op if already done)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('snooze', {
      name: 'Snooze Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  await ensureCategoryRegistered();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Serialization lock ───────────────────────────────────────────────
// Ensures scheduling / cancellation operations run sequentially, avoiding
// race conditions between mutation hooks and foreground sync.

let _schedulingChain: Promise<void> = Promise.resolve();

function withSchedulingLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = _schedulingChain.then(fn, fn); // always proceed regardless of prior failure
  _schedulingChain = next.then(
    () => {},
    () => {},
  ); // swallow result to keep chain as Promise<void>
  return next;
}

// ── Snooze notifications ─────────────────────────────────────────────

/**
 * Schedule a local notification that fires when a snooze expires.
 * Includes action buttons (Take Now / Snooze Again) and dose metadata.
 * Returns the notification identifier so it can be cancelled later.
 */
export async function scheduleSnoozeNotification(
  medicationName: string,
  durationMs: number,
  doseData: SnoozeNotificationData,
): Promise<string> {
  // Ensure the category is registered before scheduling
  await ensureCategoryRegistered();

  const triggerSeconds = Math.max(1, Math.round(durationMs / 1000));

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Snooze ended ⏰',
      body: `Time to take your ${medicationName}!`,
      sound: true,
      categoryIdentifier: SNOOZE_CATEGORY,
      data: { ...doseData, notifType: 'snooze' } as unknown as Record<string, unknown>,
      ...(Platform.OS === 'android' ? { channelId: 'snooze' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: triggerSeconds,
      repeats: false,
    },
  });
  return id;
}

// ── Response listener helper ─────────────────────────────────────────

/**
 * Subscribe to notification‐action responses.
 * Returns a subscription that should be removed on unmount.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Cancel a previously‐scheduled snooze notification by its identifier.
 * Safe to call even if the notification already fired or doesn't exist.
 */
export async function cancelSnoozeNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // already delivered or removed — nothing to do
  }
}

// ── Scheduled medication reminders ───────────────────────────────────

/**
 * Parse a time label into 24-hour { hour, minute }.
 * Handles preset labels ("Morning", "Afternoon", etc.) and custom
 * time strings like "12:45 AM", "9:30 PM".
 */
export function parseTimeToHourMinute(label: string): { hour: number; minute: number } | null {
  // Check presets first
  const preset = PRESET_TIME_MAP[label];
  if (preset) return preset;

  // Parse "h:mm AM/PM"
  const match = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'AM' && hour === 12) hour = 0;
  else if (period === 'PM' && hour !== 12) hour += 12;

  return { hour, minute };
}

/** Shape of schedule data needed for notification scheduling */
export type ScheduleNotifInput = {
  id: string;
  medication_id: string;
  frequency: string;
  selected_days: string[];
  times_of_day: string[];
  push_notifications: boolean;
  snooze_duration: string;
  dosage_per_dose: number;
  interval_days: number | null;
  start_date: string;
};

/**
 * Schedule OS-level repeating notifications for a medication schedule.
 * - Daily schedules use DAILY triggers (fire every day).
 * - Weekly schedules use WEEKLY triggers (fire on specific weekdays).
 * - Interval schedules use DATE triggers for the next 7 occurrences.
 *
 * Uses OS-level notification query for cancellation to avoid ghost notifications.
 * Skips scheduling if push_notifications is disabled on the schedule.
 */
export function scheduleMedicationReminders(
  schedule: ScheduleNotifInput,
  medicationName: string,
): Promise<void> {
  return withSchedulingLock(() => _scheduleMedicationReminders(schedule, medicationName));
}

async function _scheduleMedicationReminders(
  schedule: ScheduleNotifInput,
  medicationName: string,
): Promise<void> {
  // Always cancel existing reminders first to avoid duplicates
  await cancelMedicationReminders(schedule.id);

  if (!schedule.push_notifications) return;

  const ids: string[] = [];
  const channelId = Platform.OS === 'android' ? 'medication-reminders' : undefined;

  for (const timeLabel of schedule.times_of_day) {
    const parsed = parseTimeToHourMinute(timeLabel);
    if (!parsed) continue;

    const { hour, minute } = parsed;
    const displayTime = PRESET_TIME_MAP[timeLabel]
      ? `${timeLabel} (${hour > 12 ? hour - 12 : hour || 12}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'})`
      : timeLabel;

    const doseKey = `${schedule.id}-${timeLabel}`;
    const doseData = {
      notifType: 'reminder' as const,
      doseKey,
      medicationId: schedule.medication_id,
      scheduleId: schedule.id,
      medicationName,
      snoozeDuration: schedule.snooze_duration,
      timeLabel,
      dosagePerDose: schedule.dosage_per_dose,
    };

    if (schedule.frequency === 'daily') {
      // Fire once every day at this time
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 Time for ${medicationName}`,
          body: `Scheduled dose at ${displayTime}`,
          sound: true,
          categoryIdentifier: SNOOZE_CATEGORY,
          ...(channelId ? { channelId } : {}),
          data: doseData as unknown as Record<string, unknown>,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          ...(channelId ? { channelId } : {}),
        },
      });
      ids.push(id);
    } else if (schedule.frequency === 'interval' && schedule.interval_days) {
      // Interval — schedule DATE triggers for the next 7 occurrences
      const intervalDays = schedule.interval_days;
      const startDate = new Date(`${schedule.start_date}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find the first occurrence on or after today
      const diffMs = today.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      const offset =
        diffDays >= 0
          ? (intervalDays - (diffDays % intervalDays)) % intervalDays
          : Math.abs(diffDays) % intervalDays === 0
            ? 0
            : intervalDays - (Math.abs(diffDays) % intervalDays);

      for (let i = 0; i < 7; i++) {
        const occDate = new Date(today);
        occDate.setDate(occDate.getDate() + offset + i * intervalDays);
        occDate.setHours(hour, minute, 0, 0);

        // Skip if already in the past
        if (occDate.getTime() <= Date.now()) continue;
        // Skip if beyond end_date (if set) — check via schedule start/end constraints
        const occISO = occDate.toISOString().slice(0, 10);
        if (schedule.start_date && occISO < schedule.start_date) continue;

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 Time for ${medicationName}`,
            body: `Scheduled dose at ${displayTime}`,
            sound: true,
            categoryIdentifier: SNOOZE_CATEGORY,
            ...(channelId ? { channelId } : {}),
            data: doseData as unknown as Record<string, unknown>,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: occDate,
            ...(channelId ? { channelId } : {}),
          },
        });
        ids.push(id);
      }
    } else {
      // Weekly — schedule one WEEKLY trigger per selected day
      for (const day of schedule.selected_days) {
        const weekday = DAY_TO_WEEKDAY[day];
        if (!weekday) continue;

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💊 Time for ${medicationName}`,
            body: `Scheduled dose at ${displayTime}`,
            sound: true,
            categoryIdentifier: SNOOZE_CATEGORY,
            ...(channelId ? { channelId } : {}),
            data: doseData as unknown as Record<string, unknown>,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
            ...(channelId ? { channelId } : {}),
          },
        });
        ids.push(id);
      }
    }
  }

  // Persist the notification IDs for later cancellation
  if (ids.length > 0) {
    await AsyncStorage.setItem(`${NOTIF_IDS_PREFIX}${schedule.id}`, JSON.stringify(ids));
    console.log(`[Notifications] Scheduled ${ids.length} reminder(s) for schedule ${schedule.id}`);
  }
}

/**
 * Cancel all scheduled medication reminders for a given schedule ID.
 * Queries OS-level scheduled notifications to find all matching reminders,
 * avoiding ghost notifications from race conditions.
 */
export async function cancelMedicationReminders(scheduleId: string): Promise<void> {
  try {
    // Query OS for all scheduled notifications and cancel those matching this schedule
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matching = allScheduled.filter(
      (n) => n.content.data?.notifType === 'reminder' && n.content.data?.scheduleId === scheduleId,
    );
    await Promise.all(
      matching.map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}),
      ),
    );

    // Also cancel any legacy IDs stored in AsyncStorage (housekeeping)
    const raw = await AsyncStorage.getItem(`${NOTIF_IDS_PREFIX}${scheduleId}`);
    if (raw) {
      const legacyIds: string[] = JSON.parse(raw).filter(
        (id: string) => !matching.some((n) => n.identifier === id),
      );
      await Promise.all(
        legacyIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
      );
      await AsyncStorage.removeItem(`${NOTIF_IDS_PREFIX}${scheduleId}`);
    }

    if (matching.length > 0) {
      console.log(
        `[Notifications] Cancelled ${matching.length} reminder(s) for schedule ${scheduleId}`,
      );
    }
  } catch (err) {
    console.warn('[Notifications] Failed to cancel medication reminders:', err);
  }
}

/**
 * Re-register all medication reminders for every active schedule.
 * Call this on app launch to ensure notifications survive app restarts
 * and OS-level notification clearing.
 */
export function rescheduleAllMedicationReminders(
  schedules: ScheduleNotifInput[],
  medicationNames: Record<string, string>,
): Promise<void> {
  return withSchedulingLock(async () => {
    for (const schedule of schedules) {
      const medName = medicationNames[schedule.id] ?? 'your medication';
      await _scheduleMedicationReminders(schedule, medName);
    }
    console.log(`[Notifications] Re-registered reminders for ${schedules.length} schedule(s)`);
  });
}

// ── Low-supply daily reminders ───────────────────────────────────────

/** AsyncStorage key prefix for low-supply notification IDs */
const LOW_SUPPLY_NOTIF_PREFIX = 'low_supply_notif_';

/**
 * Schedule a repeating daily notification at 9:00 AM reminding the user
 * that a medication is running low.
 * Safe to call multiple times — cancels existing before re-scheduling.
 *
 * @param fireImmediate If true (default), also fires an immediate notification.
 *   Set to false when re-checking on app foreground to avoid spamming the user.
 */
export function scheduleLowSupplyReminder(
  medicationId: string,
  medicationName: string,
  currentSupply: number,
  fireImmediate = true,
): Promise<void> {
  return withSchedulingLock(() =>
    _scheduleLowSupplyReminder(medicationId, medicationName, currentSupply, fireImmediate),
  );
}

async function _scheduleLowSupplyReminder(
  medicationId: string,
  medicationName: string,
  currentSupply: number,
  fireImmediate: boolean,
): Promise<void> {
  // Cancel any existing low-supply notification for this medication first
  await _cancelLowSupplyReminder(medicationId);

  const channelId = Platform.OS === 'android' ? 'medication-reminders' : undefined;
  const lowSupplyData = { notifType: 'low-supply' as const, medicationId };

  // Fire an immediate notification so the user knows right away
  if (fireImmediate) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Low Supply',
        body: `${medicationName} is running low — only ${currentSupply} remaining. Time to refill!`,
        sound: true,
        data: lowSupplyData as unknown as Record<string, unknown>,
        ...(channelId ? { channelId } : {}),
      },
      trigger: null, // immediate
    });
  }

  // Also schedule a recurring daily 9:00 AM reminder until refilled
  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Low Supply',
      body: `${medicationName} is running low — only ${currentSupply} remaining. Time to refill!`,
      sound: true,
      data: lowSupplyData as unknown as Record<string, unknown>,
      ...(channelId ? { channelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
      ...(channelId ? { channelId } : {}),
    },
  });

  await AsyncStorage.setItem(`${LOW_SUPPLY_NOTIF_PREFIX}${medicationId}`, notifId);
  console.log(
    `[Notifications] Low-supply reminder scheduled for ${medicationName} (${medicationId})`,
  );
}

/**
 * Cancel the daily low-supply reminder for a given medication.
 * Queries OS-level state to catch ghost notifications from race conditions.
 */
export function cancelLowSupplyReminder(medicationId: string): Promise<void> {
  return withSchedulingLock(() => _cancelLowSupplyReminder(medicationId));
}

async function _cancelLowSupplyReminder(medicationId: string): Promise<void> {
  try {
    // Query OS for all scheduled notifications matching this medication's low-supply
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const matching = allScheduled.filter(
      (n) =>
        n.content.data?.notifType === 'low-supply' && n.content.data?.medicationId === medicationId,
    );
    await Promise.all(
      matching.map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}),
      ),
    );

    // Also dismiss any already-presented low-supply notifications for this medication
    const presented = await Notifications.getPresentedNotificationsAsync();
    const presentedMatching = presented.filter(
      (n) =>
        n.request.content.data?.notifType === 'low-supply' &&
        n.request.content.data?.medicationId === medicationId,
    );
    await Promise.all(
      presentedMatching.map((n) =>
        Notifications.dismissNotificationAsync(n.request.identifier).catch(() => {}),
      ),
    );

    // Clean up legacy AsyncStorage entry
    const notifId = await AsyncStorage.getItem(`${LOW_SUPPLY_NOTIF_PREFIX}${medicationId}`);
    if (notifId) {
      if (!matching.some((n) => n.identifier === notifId)) {
        await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
      }
      await AsyncStorage.removeItem(`${LOW_SUPPLY_NOTIF_PREFIX}${medicationId}`);
    }

    if (matching.length > 0 || presentedMatching.length > 0) {
      console.log(
        `[Notifications] Low-supply reminder cancelled for medication ${medicationId} (${matching.length} scheduled, ${presentedMatching.length} presented)`,
      );
    }
  } catch (err) {
    console.warn('[Notifications] Failed to cancel low-supply reminder:', err);
  }
}

/** Medication data needed for low-supply checks */
export type LowSupplyMedication = {
  id: string;
  name: string;
  current_supply: number;
  low_supply_threshold: number;
  is_active: boolean;
};

/**
 * Check all medications and schedule / cancel low-supply reminders as needed.
 * Call on app launch to ensure reminders reflect current inventory state.
 * Does NOT fire immediate notifications — only (re-)schedules daily 9 AM reminders.
 */
export function recheckAllLowSupplyReminders(medications: LowSupplyMedication[]): Promise<void> {
  return withSchedulingLock(async () => {
    for (const med of medications) {
      if (med.is_active && med.current_supply <= med.low_supply_threshold) {
        await _scheduleLowSupplyReminder(med.id, med.name, med.current_supply, false);
      } else {
        await _cancelLowSupplyReminder(med.id);
      }
    }
    console.log(
      `[Notifications] Low-supply check complete for ${medications.length} medication(s)`,
    );
  });
}

// ── Missed-dose catch-up notifications ───────────────────────────────

/** Data needed per schedule for missed-dose detection */
export type MissedDoseScheduleInput = {
  id: string;
  medication_id: string;
  frequency: string;
  selected_days: string[];
  times_of_day: string[];
  push_notifications: boolean;
  interval_days: number | null;
  start_date: string;
};

/** Data needed per dose log for missed-dose detection */
export type MissedDoseLogInput = {
  schedule_id: string;
  time_label: string;
};

/**
 * Fire immediate catch-up notifications for doses scheduled earlier today
 * that were never delivered (e.g. phone was off at the scheduled time).
 * Skips doses that already have a log entry (taken/skipped).
 */
export async function fireMissedDoseReminders(
  schedules: MissedDoseScheduleInput[],
  todayLogs: MissedDoseLogInput[],
  medicationNames: Record<string, string>,
): Promise<void> {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayLabel = dayLabels[now.getDay()];

  const loggedKeys = new Set(todayLogs.map((l) => `${l.schedule_id}-${l.time_label}`));

  const channelId = Platform.OS === 'android' ? 'medication-reminders' : undefined;
  let fired = 0;

  for (const sch of schedules) {
    if (!sch.push_notifications) continue;

    // Check if today is a scheduled day for this frequency
    if (sch.frequency === 'interval' && sch.interval_days) {
      const startDate = new Date(`${sch.start_date}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today.getTime() - startDate.getTime()) / 86400000);
      if (diffDays < 0 || diffDays % sch.interval_days !== 0) continue;
    } else if (sch.frequency !== 'daily') {
      if (!sch.selected_days.includes(todayLabel)) continue;
    }

    for (const timeLabel of sch.times_of_day) {
      const parsed = parseTimeToHourMinute(timeLabel);
      if (!parsed) continue;

      const scheduleMinutes = parsed.hour * 60 + parsed.minute;
      if (scheduleMinutes >= currentMinutes) continue;
      if (loggedKeys.has(`${sch.id}-${timeLabel}`)) continue;

      const medName = medicationNames[sch.id] ?? 'your medication';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `💊 Missed: ${medName}`,
          body: `You had a dose scheduled at ${timeLabel}. Don't forget to take it!`,
          sound: true,
          ...(channelId ? { channelId } : {}),
        },
        trigger: null, // immediate
      });
      fired++;
    }
  }

  if (fired > 0) {
    console.log(`[Notifications] Fired ${fired} missed-dose catch-up notification(s)`);
  }
}

// ── Deduplication (cleanup for existing users) ───────────────────────

/**
 * Build a string key that uniquely identifies a notification's "slot".
 * Notifications with the same key are duplicates of each other.
 */
function buildDedupKey(n: Notifications.NotificationRequest): string {
  const t = n.trigger as Record<string, unknown> | null;
  const title = n.content.title ?? '';
  const triggerType = t?.type ?? 'unknown';

  if (triggerType === 'daily') {
    return `daily|${title}|${t?.hour}:${t?.minute}`;
  }
  if (triggerType === 'weekly') {
    return `weekly|${title}|${t?.weekday}|${t?.hour}:${t?.minute}`;
  }
  // For date / timeInterval triggers, use the identifier as-is (no dedup)
  return `unique|${n.identifier}`;
}

/**
 * Remove duplicate scheduled notifications.
 * Groups by trigger type + title + time, keeps the newest (or the one with
 * `notifType` in its data), and cancels the rest.
 * Returns the number of duplicates removed.
 */
export async function deduplicateScheduledNotifications(): Promise<number> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const groups = new Map<string, Notifications.NotificationRequest[]>();

  for (const n of all) {
    const key = buildDedupKey(n);
    const group = groups.get(key);
    if (group) group.push(n);
    else groups.set(key, [n]);
  }

  let removed = 0;
  for (const [, group] of groups) {
    if (group.length <= 1) continue;

    // Prefer the one with notifType tag (from the fix); otherwise keep the first
    const tagged = group.find((n) => (n.content.data as Record<string, unknown>)?.notifType);
    const keep = tagged ?? group[0];

    for (const n of group) {
      if (n.identifier === keep.identifier) continue;
      await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`[Notifications] Deduplicated: removed ${removed} ghost notification(s)`);
  }
  return removed;
}
