import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  scheduleId: string;
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
      data: doseData as unknown as Record<string, unknown>,
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
};

/**
 * Schedule OS-level repeating notifications for a medication schedule.
 * - Daily schedules use DAILY triggers (fire every day).
 * - Weekly/Interval schedules use WEEKLY triggers (fire on specific weekdays).
 *
 * Stores notification IDs in AsyncStorage so they can be cancelled later.
 * Skips scheduling if push_notifications is disabled on the schedule.
 */
export async function scheduleMedicationReminders(
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
    const doseData: SnoozeNotificationData = {
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
    } else {
      // Weekly / Interval — schedule one WEEKLY trigger per selected day
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
 * Removes stored notification IDs from AsyncStorage.
 */
export async function cancelMedicationReminders(scheduleId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(`${NOTIF_IDS_PREFIX}${scheduleId}`);
    if (!raw) return;

    const ids: string[] = JSON.parse(raw);
    await Promise.all(
      ids.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
      ),
    );
    await AsyncStorage.removeItem(`${NOTIF_IDS_PREFIX}${scheduleId}`);
    console.log(`[Notifications] Cancelled ${ids.length} reminder(s) for schedule ${scheduleId}`);
  } catch (err) {
    console.warn('[Notifications] Failed to cancel medication reminders:', err);
  }
}

/**
 * Re-register all medication reminders for every active schedule.
 * Call this on app launch to ensure notifications survive app restarts
 * and OS-level notification clearing.
 */
export async function rescheduleAllMedicationReminders(
  schedules: ScheduleNotifInput[],
  medicationNames: Record<string, string>,
): Promise<void> {
  for (const schedule of schedules) {
    const medName = medicationNames[schedule.id] ?? 'your medication';
    await scheduleMedicationReminders(schedule, medName);
  }
  console.log(`[Notifications] Re-registered reminders for ${schedules.length} schedule(s)`);
}

// ── Low-supply daily reminders ───────────────────────────────────────

/** AsyncStorage key prefix for low-supply notification IDs */
const LOW_SUPPLY_NOTIF_PREFIX = 'low_supply_notif_';

/**
 * Schedule a repeating daily notification at 9:00 AM reminding the user
 * that a medication is running low.
 * Safe to call multiple times — cancels existing before re-scheduling.
 */
export async function scheduleLowSupplyReminder(
  medicationId: string,
  medicationName: string,
  currentSupply: number,
): Promise<void> {
  // Cancel any existing low-supply notification for this medication first
  await cancelLowSupplyReminder(medicationId);

  const channelId = Platform.OS === 'android' ? 'medication-reminders' : undefined;

  // Fire an immediate notification so the user knows right away
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Low Supply',
      body: `${medicationName} is running low — only ${currentSupply} remaining. Time to refill!`,
      sound: true,
      ...(channelId ? { channelId } : {}),
    },
    trigger: null, // immediate
  });

  // Also schedule a recurring daily 9:00 AM reminder until refilled
  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Low Supply',
      body: `${medicationName} is running low — only ${currentSupply} remaining. Time to refill!`,
      sound: true,
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
  console.log(`[Notifications] Low-supply reminder scheduled for ${medicationName} (${medicationId})`);
}

/**
 * Cancel the daily low-supply reminder for a given medication.
 */
export async function cancelLowSupplyReminder(medicationId: string): Promise<void> {
  try {
    const notifId = await AsyncStorage.getItem(`${LOW_SUPPLY_NOTIF_PREFIX}${medicationId}`);
    if (!notifId) return;

    await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
    await AsyncStorage.removeItem(`${LOW_SUPPLY_NOTIF_PREFIX}${medicationId}`);
    console.log(`[Notifications] Low-supply reminder cancelled for medication ${medicationId}`);
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
 */
export async function recheckAllLowSupplyReminders(
  medications: LowSupplyMedication[],
): Promise<void> {
  for (const med of medications) {
    if (med.is_active && med.current_supply <= med.low_supply_threshold) {
      await scheduleLowSupplyReminder(med.id, med.name, med.current_supply);
    } else {
      await cancelLowSupplyReminder(med.id);
    }
  }
  console.log(`[Notifications] Low-supply check complete for ${medications.length} medication(s)`);
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

  const loggedKeys = new Set(
    todayLogs.map((l) => `${l.schedule_id}-${l.time_label}`),
  );

  const channelId = Platform.OS === 'android' ? 'medication-reminders' : undefined;
  let fired = 0;

  for (const sch of schedules) {
    if (!sch.push_notifications) continue;
    if (!sch.selected_days.includes(todayLabel)) continue;

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
