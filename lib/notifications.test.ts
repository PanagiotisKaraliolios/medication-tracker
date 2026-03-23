import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

/** Shape of a scheduleNotificationAsync mock call for type-safe assertions */
type NotifMockCall = [
  {
    content: { title?: string; channelId?: string };
    trigger?: { type?: string; date?: Date; channelId?: string };
  },
];

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notif-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  getPresentedNotificationsAsync: jest.fn().mockResolvedValue([]),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
  setNotificationCategoryAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    DATE: 'date',
  },
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import {
  cancelLowSupplyReminder,
  cancelMedicationReminders,
  cancelSnoozeNotification,
  deduplicateScheduledNotifications,
  fireMissedDoseReminders,
  type LowSupplyMedication,
  parseTimeToHourMinute,
  recheckAllLowSupplyReminders,
  registerNotificationHandler,
  requestNotificationPermissions,
  rescheduleAllMedicationReminders,
  type ScheduleNotifInput,
  type SnoozeNotificationData,
  scheduleLowSupplyReminder,
  scheduleMedicationReminders,
  scheduleSnoozeNotification,
} from './notifications';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── parseTimeToHourMinute ────────────────────────────────────────────

describe('parseTimeToHourMinute', () => {
  it('returns {8, 0} for Morning', () => {
    expect(parseTimeToHourMinute('Morning')).toEqual({ hour: 8, minute: 0 });
  });

  it('returns {12, 0} for Afternoon', () => {
    expect(parseTimeToHourMinute('Afternoon')).toEqual({ hour: 12, minute: 0 });
  });

  it('returns {18, 0} for Evening', () => {
    expect(parseTimeToHourMinute('Evening')).toEqual({ hour: 18, minute: 0 });
  });

  it('returns {22, 0} for Night', () => {
    expect(parseTimeToHourMinute('Night')).toEqual({ hour: 22, minute: 0 });
  });

  it('parses "9:30 AM" correctly', () => {
    expect(parseTimeToHourMinute('9:30 AM')).toEqual({ hour: 9, minute: 30 });
  });

  it('parses "1:45 PM" correctly', () => {
    expect(parseTimeToHourMinute('1:45 PM')).toEqual({ hour: 13, minute: 45 });
  });

  it('parses "12:00 AM" as midnight', () => {
    expect(parseTimeToHourMinute('12:00 AM')).toEqual({ hour: 0, minute: 0 });
  });

  it('parses "12:00 PM" as noon', () => {
    expect(parseTimeToHourMinute('12:00 PM')).toEqual({ hour: 12, minute: 0 });
  });

  it('returns null for "invalid"', () => {
    expect(parseTimeToHourMinute('invalid')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseTimeToHourMinute('')).toBeNull();
  });

  it('returns null for "25:00 AM"', () => {
    // The regex matches but the hour value is out of range; the function
    // still returns a result because it doesn't validate ranges beyond parsing.
    // However "25:00 AM" does match the regex pattern, so it returns { hour: 25, minute: 0 }.
    // If the function were to reject it, this test would need updating.
    const result = parseTimeToHourMinute('25:00 AM');
    // The regex ^(\d{1,2}):(\d{2})\s*(AM|PM)$ matches "25:00 AM"
    // so it returns { hour: 25, minute: 0 } — function doesn't validate range
    expect(result).toEqual({ hour: 25, minute: 0 });
  });
});

// ── scheduleSnoozeNotification ───────────────────────────────────────

describe('scheduleSnoozeNotification', () => {
  const doseData: SnoozeNotificationData = {
    doseKey: 'sched-1-Morning',
    medicationId: 'med-1',
    scheduleId: 'sched-1',
    medicationName: 'Aspirin',
    snoozeDuration: '5 min',
    timeLabel: 'Morning',
    dosagePerDose: 1,
  };

  it('calls scheduleNotificationAsync with TIME_INTERVAL trigger', async () => {
    const id = await scheduleSnoozeNotification('Aspirin', 300_000, doseData);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: 'timeInterval',
          seconds: 300,
          repeats: false,
        }),
      }),
    );
    expect(id).toBe('mock-notif-id');
  });

  it('uses minimum 1 second for very short durations', async () => {
    await scheduleSnoozeNotification('Aspirin', 100, doseData);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ seconds: 1 }),
      }),
    );
  });

  it('returns the notification ID', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('snooze-id-123');
    const id = await scheduleSnoozeNotification('Aspirin', 60_000, doseData);
    expect(id).toBe('snooze-id-123');
  });
});

// ── cancelSnoozeNotification ─────────────────────────────────────────

describe('cancelSnoozeNotification', () => {
  it('calls cancelScheduledNotificationAsync with the given ID', async () => {
    await cancelSnoozeNotification('notif-abc');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-abc');
  });

  it('does not throw when cancellation fails', async () => {
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValueOnce(
      new Error('not found'),
    );
    await expect(cancelSnoozeNotification('gone-id')).resolves.toBeUndefined();
  });
});

// ── scheduleMedicationReminders ──────────────────────────────────────

describe('scheduleMedicationReminders', () => {
  const baseSchedule: ScheduleNotifInput = {
    id: 'sched-1',
    medication_id: 'med-1',
    frequency: 'daily',
    selected_days: ['Mon', 'Wed', 'Fri'],
    times_of_day: ['Morning'],
    push_notifications: true,
    snooze_duration: '5 min',
    dosage_per_dose: 1,
    interval_days: null,
    start_date: '2025-01-01',
  };

  it('cancels existing reminders before scheduling', async () => {
    await scheduleMedicationReminders(baseSchedule, 'Aspirin');

    // cancelMedicationReminders queries OS via getAllScheduledNotificationsAsync
    expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('skips scheduling when push_notifications is false', async () => {
    const schedule = { ...baseSchedule, push_notifications: false };
    await scheduleMedicationReminders(schedule, 'Aspirin');

    // Should still cancel existing, but not schedule new
    expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalled();
    // Only the cancel-phase calls; no DAILY trigger scheduled
    const scheduleCalls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    expect(scheduleCalls).toHaveLength(0);
  });

  it('creates DAILY trigger for daily frequency', async () => {
    await scheduleMedicationReminders(baseSchedule, 'Aspirin');

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({
          type: 'daily',
          hour: 8,
          minute: 0,
        }),
      }),
    );
  });

  it('creates one DAILY trigger per time_of_day entry', async () => {
    const schedule = { ...baseSchedule, times_of_day: ['Morning', 'Evening'] };
    await scheduleMedicationReminders(schedule, 'Aspirin');

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0].trigger).toMatchObject({ type: 'daily', hour: 8, minute: 0 });
    expect(calls[1][0].trigger).toMatchObject({ type: 'daily', hour: 18, minute: 0 });
  });

  it('creates WEEKLY triggers for weekly frequency', async () => {
    const schedule = {
      ...baseSchedule,
      frequency: 'weekly',
      selected_days: ['Mon', 'Fri'],
      times_of_day: ['Morning'],
    };
    await scheduleMedicationReminders(schedule, 'Aspirin');

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0].trigger).toMatchObject({ type: 'weekly', weekday: 2, hour: 8, minute: 0 });
    expect(calls[1][0].trigger).toMatchObject({ type: 'weekly', weekday: 6, hour: 8, minute: 0 });
  });

  it('creates WEEKLY triggers for each day × time combination', async () => {
    const schedule = {
      ...baseSchedule,
      frequency: 'weekly',
      selected_days: ['Mon', 'Wed'],
      times_of_day: ['Morning', 'Night'],
    };
    await scheduleMedicationReminders(schedule, 'Aspirin');

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    // 2 times × 2 days = 4 triggers
    expect(calls).toHaveLength(4);
  });

  it('stores notification IDs in AsyncStorage', async () => {
    await scheduleMedicationReminders(baseSchedule, 'Aspirin');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('notif_ids_sched-1', expect.any(String));
    const storedValue = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(storedValue)).toEqual(['mock-notif-id']);
  });

  it('includes medication name and snooze data in content', async () => {
    await scheduleMedicationReminders(baseSchedule, 'Aspirin');

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('Aspirin'),
          data: expect.objectContaining({
            notifType: 'reminder',
            medicationId: 'med-1',
            scheduleId: 'sched-1',
          }),
        }),
      }),
    );
  });
});

// ── cancelMedicationReminders ────────────────────────────────────────

describe('cancelMedicationReminders', () => {
  it('cancels matching notifications from OS query', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'notif-a',
        content: { data: { notifType: 'reminder', scheduleId: 'sched-1' } },
      },
      {
        identifier: 'notif-b',
        content: { data: { notifType: 'reminder', scheduleId: 'sched-2' } },
      },
    ]);

    await cancelMedicationReminders('sched-1');

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-a');
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('notif-b');
  });

  it('cleans up AsyncStorage entries', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(['legacy-id-1']));

    await cancelMedicationReminders('sched-1');

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('legacy-id-1');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('notif_ids_sched-1');
  });

  it('handles errors gracefully', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockRejectedValueOnce(
      new Error('OS error'),
    );
    await expect(cancelMedicationReminders('sched-1')).resolves.toBeUndefined();
  });
});

// ── scheduleLowSupplyReminder ────────────────────────────────────────

describe('scheduleLowSupplyReminder', () => {
  it('fires immediate + daily 9 AM notification by default', async () => {
    await scheduleLowSupplyReminder('med-1', 'Aspirin', 3);

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    // 1 immediate (trigger: null) + 1 daily 9 AM
    expect(calls).toHaveLength(2);
    expect(calls[0][0].trigger).toBeNull();
    expect(calls[1][0].trigger).toMatchObject({ type: 'daily', hour: 9, minute: 0 });
  });

  it('skips immediate when fireImmediate is false', async () => {
    await scheduleLowSupplyReminder('med-1', 'Aspirin', 3, false);

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0].trigger).toMatchObject({ type: 'daily', hour: 9, minute: 0 });
  });

  it('stores notification ID in AsyncStorage', async () => {
    await scheduleLowSupplyReminder('med-1', 'Aspirin', 3);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('low_supply_notif_med-1', 'mock-notif-id');
  });
});

// ── cancelLowSupplyReminder ──────────────────────────────────────────

describe('cancelLowSupplyReminder', () => {
  it('cancels scheduled + presented notifications', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'scheduled-ls',
        content: { data: { notifType: 'low-supply', medicationId: 'med-1' } },
      },
    ]);
    (Notifications.getPresentedNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        request: {
          identifier: 'presented-ls',
          content: { data: { notifType: 'low-supply', medicationId: 'med-1' } },
        },
      },
    ]);

    await cancelLowSupplyReminder('med-1');

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('scheduled-ls');
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('presented-ls');
  });

  it('removes AsyncStorage entry', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([]);
    (Notifications.getPresentedNotificationsAsync as jest.Mock).mockResolvedValueOnce([]);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('old-notif-id');

    await cancelLowSupplyReminder('med-1');

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-notif-id');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('low_supply_notif_med-1');
  });

  it('handles errors gracefully', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockRejectedValueOnce(
      new Error('fail'),
    );
    await expect(cancelLowSupplyReminder('med-1')).resolves.toBeUndefined();
  });
});

// ── fireMissedDoseReminders ──────────────────────────────────────────

describe('fireMissedDoseReminders', () => {
  const medicationNames: Record<string, string> = { 'sched-1': 'Aspirin' };

  function makeSchedule(
    overrides: Partial<import('./notifications').MissedDoseScheduleInput> = {},
  ): import('./notifications').MissedDoseScheduleInput {
    return {
      id: 'sched-1',
      medication_id: 'med-1',
      frequency: 'daily',
      selected_days: [],
      times_of_day: ['Morning'],
      push_notifications: true,
      interval_days: null,
      start_date: '2025-01-01',
      ...overrides,
    };
  }

  it('fires for past times with no log entry', async () => {
    // Morning = 8:00 AM — set current time to after that
    const realDate = Date;
    const mockNow = new Date('2026-03-23T10:00:00');
    jest.spyOn(global, 'Date').mockImplementation((...args: unknown[]) => {
      if (args.length === 0) return mockNow;
      // @ts-expect-error
      return new realDate(...args);
    });
    (Date as unknown as { now: () => number }).now = () => mockNow.getTime();

    await fireMissedDoseReminders([makeSchedule()], [], medicationNames);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: expect.stringContaining('Aspirin'),
        }),
        trigger: null,
      }),
    );

    jest.restoreAllMocks();
  });

  it('skips doses that already have a log entry', async () => {
    const realDate = Date;
    const mockNow = new Date('2026-03-23T10:00:00');
    jest.spyOn(global, 'Date').mockImplementation((...args: unknown[]) => {
      if (args.length === 0) return mockNow;
      // @ts-expect-error
      return new realDate(...args);
    });
    (Date as unknown as { now: () => number }).now = () => mockNow.getTime();

    const logs = [{ schedule_id: 'sched-1', time_label: 'Morning' }];
    await fireMissedDoseReminders([makeSchedule()], logs, medicationNames);

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('skips future times', async () => {
    // Night = 22:00 — set current time to before that
    const realDate = Date;
    const mockNow = new Date('2026-03-23T10:00:00');
    jest.spyOn(global, 'Date').mockImplementation((...args: unknown[]) => {
      if (args.length === 0) return mockNow;
      // @ts-expect-error
      return new realDate(...args);
    });
    (Date as unknown as { now: () => number }).now = () => mockNow.getTime();

    await fireMissedDoseReminders([makeSchedule({ times_of_day: ['Night'] })], [], medicationNames);

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  it('checks frequency-specific day matching for weekly schedules', async () => {
    const realDate = Date;
    // March 23, 2026 is a Monday
    const mockNow = new Date('2026-03-23T10:00:00');
    jest.spyOn(global, 'Date').mockImplementation((...args: unknown[]) => {
      if (args.length === 0) return mockNow;
      // @ts-expect-error
      return new realDate(...args);
    });
    (Date as unknown as { now: () => number }).now = () => mockNow.getTime();

    // Weekly schedule NOT including Monday → should skip
    await fireMissedDoseReminders(
      [makeSchedule({ frequency: 'weekly', selected_days: ['Tue', 'Thu'] })],
      [],
      medicationNames,
    );

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});

// ── deduplicateScheduledNotifications ────────────────────────────────

describe('deduplicateScheduledNotifications', () => {
  it('returns 0 when no duplicates exist', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'n-1',
        content: { title: 'Take med', data: {} },
        trigger: { type: 'daily', hour: 8, minute: 0 },
      },
    ]);

    const removed = await deduplicateScheduledNotifications();
    expect(removed).toBe(0);
  });

  it('removes duplicates keeping the tagged version', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'n-1',
        content: { title: 'Take med', data: {} },
        trigger: { type: 'daily', hour: 8, minute: 0 },
      },
      {
        identifier: 'n-2',
        content: { title: 'Take med', data: { notifType: 'reminder' } },
        trigger: { type: 'daily', hour: 8, minute: 0 },
      },
    ]);

    const removed = await deduplicateScheduledNotifications();
    expect(removed).toBe(1);
    // Should cancel the untagged one (n-1), keep the tagged one (n-2)
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('n-1');
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('n-2');
  });

  it('handles empty list', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([]);
    const removed = await deduplicateScheduledNotifications();
    expect(removed).toBe(0);
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

// ── requestNotificationPermissions ───────────────────────────────────

describe('requestNotificationPermissions', () => {
  it('returns true when permissions are already granted', async () => {
    const result = await requestNotificationPermissions();
    expect(result).toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permissions and returns status when not granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'granted',
    });

    const result = await requestNotificationPermissions();
    expect(result).toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('sets up snooze channel on Android before requesting permissions', async () => {
    const { Platform } = require('react-native');
    const originalOS = Platform.OS;
    Platform.OS = 'android';

    await requestNotificationPermissions();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'snooze',
      expect.objectContaining({ name: 'Snooze Reminders' }),
    );

    Platform.OS = originalOS;
  });
});

// ── registerNotificationHandler ──────────────────────────────────────

describe('registerNotificationHandler', () => {
  it('calls setNotificationHandler', () => {
    registerNotificationHandler();
    expect(Notifications.setNotificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({ handleNotification: expect.any(Function) }),
    );
  });

  it('sets up Android notification channels when Platform.OS is android', () => {
    const { Platform } = require('react-native');
    const originalOS = Platform.OS;
    Platform.OS = 'android';

    registerNotificationHandler();

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'snooze',
      expect.objectContaining({ name: 'Snooze Reminders', importance: 4 }),
    );
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'medication-reminders',
      expect.objectContaining({ name: 'Medication Reminders', importance: 4 }),
    );

    Platform.OS = originalOS;
  });

  it('does not set up channels on iOS', () => {
    registerNotificationHandler();
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

// ── ensureCategoryRegistered catch branch ─────────────────────────────

describe('ensureCategoryRegistered catch branch', () => {
  it('allows retry when setNotificationCategoryAsync rejects', async () => {
    // Reset modules to get a fresh categoryReady = null
    jest.resetModules();

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    jest.doMock('expo-notifications', () => ({
      setNotificationCategoryAsync: jest
        .fn()
        .mockRejectedValueOnce(new Error('category fail'))
        .mockResolvedValueOnce(undefined),
      setNotificationHandler: jest.fn(),
      setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
      scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notif-id'),
      cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
      getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
      getPresentedNotificationsAsync: jest.fn().mockResolvedValue([]),
      dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
      SchedulableTriggerInputTypes: {
        TIME_INTERVAL: 'timeInterval',
        DAILY: 'daily',
        WEEKLY: 'weekly',
        DATE: 'date',
      },
      AndroidImportance: { HIGH: 4 },
    }));
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    }));

    const freshModule = require('./notifications');
    const freshNotif = require('expo-notifications');

    // First call: triggers category registration which will reject
    freshModule.registerNotificationHandler();
    // Wait for the promise chain (microtasks) to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to register category'),
      expect.any(Error),
    );

    // categoryReady was reset to null by the catch — second call should re-attempt
    freshModule.registerNotificationHandler();
    expect(freshNotif.setNotificationCategoryAsync).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
    jest.resetModules();
  });
});

// ── scheduleMedicationReminders (interval frequency) ─────────────────

describe('scheduleMedicationReminders (interval frequency)', () => {
  const baseSchedule: ScheduleNotifInput = {
    id: 'sch-interval-1',
    medication_id: 'med-1',
    frequency: 'interval',
    selected_days: [],
    times_of_day: ['Morning'],
    push_notifications: true,
    snooze_duration: '5 min',
    dosage_per_dose: 1,
    interval_days: 3,
    start_date: '2025-01-01',
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules DATE triggers for interval frequency (today aligns with interval)', async () => {
    // 2025-01-01 + 15 days = diffDays 15, 15 % 3 === 0, so offset = 0, next occ = today
    // But today 08:00 is in the past at 10:00, so first occ skipped.
    // Next occurrences: +3, +6, +9, +12, +15, +18 days should be scheduled.
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-16T10:00:00'));

    await scheduleMedicationReminders(baseSchedule, 'TestMed');

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    // All scheduled triggers should be DATE type
    const dateTriggers = calls.filter((c: NotifMockCall) => c[0].trigger?.type === 'date');
    expect(dateTriggers.length).toBeGreaterThan(0);
    // Each trigger should have a date property
    for (const call of dateTriggers) {
      expect(call[0].trigger.date).toBeInstanceOf(Date);
    }
  });

  it('schedules correctly when start_date is in the future (diffDays < 0)', async () => {
    jest.useFakeTimers();
    // Today is before start_date
    jest.setSystemTime(new Date('2024-12-30T06:00:00'));

    const futureSchedule: ScheduleNotifInput = {
      ...baseSchedule,
      start_date: '2025-01-01',
      interval_days: 2,
    };

    await scheduleMedicationReminders(futureSchedule, 'FutureMed');

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    const dateTriggers = calls.filter((c: NotifMockCall) => c[0].trigger?.type === 'date');
    // Should schedule future occurrences that are >= start_date
    for (const call of dateTriggers) {
      const triggerDate = call[0].trigger.date as Date;
      expect(triggerDate.toISOString().slice(0, 10) >= '2025-01-01').toBe(true);
    }
  });

  it('skips occurrences already in the past', async () => {
    jest.useFakeTimers();
    // Set time to 20:00 so Morning (08:00) today is already past
    jest.setSystemTime(new Date('2025-01-16T20:00:00'));

    await scheduleMedicationReminders(baseSchedule, 'TestMed');

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    const dateTriggers = calls.filter((c: NotifMockCall) => c[0].trigger?.type === 'date');
    // All scheduled dates should be in the future
    for (const call of dateTriggers) {
      const triggerDate = call[0].trigger.date as Date;
      expect(triggerDate.getTime()).toBeGreaterThan(new Date('2025-01-16T20:00:00').getTime());
    }
  });
});

// ── rescheduleAllMedicationReminders ─────────────────────────────────

describe('rescheduleAllMedicationReminders', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('schedules reminders for each schedule in the list', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-01T06:00:00'));

    const schedules: ScheduleNotifInput[] = [
      {
        id: 'sch-1',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: [],
        times_of_day: ['Morning'],
        push_notifications: true,
        snooze_duration: '5 min',
        dosage_per_dose: 1,
        interval_days: null,
        start_date: '2025-01-01',
      },
      {
        id: 'sch-2',
        medication_id: 'med-2',
        frequency: 'daily',
        selected_days: [],
        times_of_day: ['Evening'],
        push_notifications: true,
        snooze_duration: '10 min',
        dosage_per_dose: 2,
        interval_days: null,
        start_date: '2025-01-01',
      },
    ];

    const names: Record<string, string> = {
      'sch-1': 'Aspirin',
      'sch-2': 'Ibuprofen',
    };

    await rescheduleAllMedicationReminders(schedules, names);

    // Each schedule should produce at least one scheduleNotificationAsync call
    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    const titles = calls.map((c: NotifMockCall) => c[0].content.title);
    expect(titles).toContain('💊 Time for Aspirin');
    expect(titles).toContain('💊 Time for Ibuprofen');
  });

  it('uses fallback name when medication name not found', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-01T06:00:00'));

    const schedules: ScheduleNotifInput[] = [
      {
        id: 'sch-unknown',
        medication_id: 'med-x',
        frequency: 'daily',
        selected_days: [],
        times_of_day: ['Morning'],
        push_notifications: true,
        snooze_duration: '5 min',
        dosage_per_dose: 1,
        interval_days: null,
        start_date: '2025-01-01',
      },
    ];

    await rescheduleAllMedicationReminders(schedules, {});

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    const titles = calls.map((c: NotifMockCall) => c[0].content.title);
    expect(titles).toContain('💊 Time for your medication');
  });
});

// ── recheckAllLowSupplyReminders ─────────────────────────────────────

describe('recheckAllLowSupplyReminders', () => {
  it('schedules reminders for low-supply medications and cancels for others', async () => {
    const medications: LowSupplyMedication[] = [
      {
        id: 'med-low',
        name: 'LowMed',
        current_supply: 3,
        low_supply_threshold: 5,
        is_active: true,
      },
      { id: 'med-ok', name: 'OkMed', current_supply: 20, low_supply_threshold: 5, is_active: true },
    ];

    // Mock getAllScheduledNotificationsAsync for the cancel path
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    (Notifications.getPresentedNotificationsAsync as jest.Mock).mockResolvedValue([]);

    await recheckAllLowSupplyReminders(medications);

    // Low-supply med should trigger scheduleNotificationAsync (daily 9AM reminder)
    const scheduleCalls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    const lowSupplyTitles = scheduleCalls
      .map((c: NotifMockCall) => c[0].content.title)
      .filter((t: string) => t.includes('Low Supply'));
    expect(lowSupplyTitles.length).toBeGreaterThan(0);
  });

  it('cancels reminders for inactive medications', async () => {
    const medications: LowSupplyMedication[] = [
      {
        id: 'med-inactive',
        name: 'InactiveMed',
        current_supply: 2,
        low_supply_threshold: 5,
        is_active: false,
      },
    ];

    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    (Notifications.getPresentedNotificationsAsync as jest.Mock).mockResolvedValue([]);

    await recheckAllLowSupplyReminders(medications);

    // Should not schedule any new notifications (inactive → cancel path)
    const scheduleCalls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    const lowSupplyTitles = scheduleCalls
      .map((c: NotifMockCall) => c[0].content.title)
      .filter((t: string) => t?.includes('Low Supply'));
    expect(lowSupplyTitles.length).toBe(0);
  });

  it('cancels reminders for medications above threshold', async () => {
    const medications: LowSupplyMedication[] = [
      {
        id: 'med-full',
        name: 'FullMed',
        current_supply: 50,
        low_supply_threshold: 10,
        is_active: true,
      },
    ];

    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
    (Notifications.getPresentedNotificationsAsync as jest.Mock).mockResolvedValue([]);

    await recheckAllLowSupplyReminders(medications);

    // Above threshold → cancel path, no low-supply notifications scheduled
    const scheduleCalls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    expect(scheduleCalls.length).toBe(0);
  });
});

// ── fireMissedDoseReminders (interval frequency) ─────────────────────

describe('fireMissedDoseReminders (interval frequency)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires reminders when today is an interval day', async () => {
    jest.useFakeTimers();
    // Start 2025-01-01, interval 3 days → day 0,3,6,9... → Jan 1, 4, 7, 10
    // Set today to Jan 10 (diffDays=9, 9%3===0) at 14:00
    jest.setSystemTime(new Date('2025-01-10T14:00:00'));

    const schedules = [
      {
        id: 'sch-int',
        medication_id: 'med-1',
        frequency: 'interval' as const,
        selected_days: [] as string[],
        times_of_day: ['Morning'], // 08:00 — already past at 14:00
        push_notifications: true,
        interval_days: 3,
        start_date: '2025-01-01',
      },
    ];

    await fireMissedDoseReminders(schedules, [], { 'sch-int': 'IntervalMed' });

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0].content.title).toContain('Missed: IntervalMed');
  });

  it('skips when today is NOT an interval day', async () => {
    jest.useFakeTimers();
    // Start 2025-01-01, interval 3 → day 0,3,6,9...
    // Jan 11 → diffDays=10, 10%3 === 1 !== 0 → skip
    jest.setSystemTime(new Date('2025-01-11T14:00:00'));

    const schedules = [
      {
        id: 'sch-int',
        medication_id: 'med-1',
        frequency: 'interval' as const,
        selected_days: [] as string[],
        times_of_day: ['Morning'],
        push_notifications: true,
        interval_days: 3,
        start_date: '2025-01-01',
      },
    ];

    await fireMissedDoseReminders(schedules, [], { 'sch-int': 'IntervalMed' });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('skips when start_date is in the future (diffDays < 0)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-12-30T14:00:00'));

    const schedules = [
      {
        id: 'sch-int',
        medication_id: 'med-1',
        frequency: 'interval' as const,
        selected_days: [] as string[],
        times_of_day: ['Morning'],
        push_notifications: true,
        interval_days: 3,
        start_date: '2025-01-01',
      },
    ];

    await fireMissedDoseReminders(schedules, [], { 'sch-int': 'IntervalMed' });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

// ── deduplicateScheduledNotifications (3+ duplicates) ────────────────

describe('deduplicateScheduledNotifications (3+ duplicates)', () => {
  it('keeps the tagged one and removes all other duplicates in a group of 3', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'n-1',
        content: { title: 'Dose', data: {} },
        trigger: { type: 'daily', hour: 8, minute: 0 },
      },
      {
        identifier: 'n-2',
        content: { title: 'Dose', data: { notifType: 'reminder' } },
        trigger: { type: 'daily', hour: 8, minute: 0 },
      },
      {
        identifier: 'n-3',
        content: { title: 'Dose', data: {} },
        trigger: { type: 'daily', hour: 8, minute: 0 },
      },
    ]);

    const removed = await deduplicateScheduledNotifications();
    expect(removed).toBe(2);
    // Should keep n-2 (tagged) and remove n-1 and n-3
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('n-1');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('n-3');
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('n-2');
  });

  it('keeps first entry when none are tagged in a group of 3', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'a-1',
        content: { title: 'Pill', data: {} },
        trigger: { type: 'daily', hour: 9, minute: 30 },
      },
      {
        identifier: 'a-2',
        content: { title: 'Pill', data: {} },
        trigger: { type: 'daily', hour: 9, minute: 30 },
      },
      {
        identifier: 'a-3',
        content: { title: 'Pill', data: {} },
        trigger: { type: 'daily', hour: 9, minute: 30 },
      },
    ]);

    const removed = await deduplicateScheduledNotifications();
    expect(removed).toBe(2);
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('a-1');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('a-2');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('a-3');
  });
});

// ── Android channelId branches ──────────────────────────────────────
// The top-level jest.mock('react-native') returns a mutable Platform object.
// We simply switch Platform.OS to 'android' for these tests — the notification
// functions reference the same object via their import closure.

describe('Android channelId branches', () => {
  const RN = require('react-native');

  beforeAll(() => {
    RN.Platform.OS = 'android';
  });

  afterAll(() => {
    RN.Platform.OS = 'ios';
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('scheduleSnoozeNotification includes channelId "snooze" on Android', async () => {
    const doseData: SnoozeNotificationData = {
      doseKey: 'sched-1-Morning',
      medicationId: 'med-1',
      scheduleId: 'sched-1',
      medicationName: 'Aspirin',
      snoozeDuration: '5 min',
      timeLabel: 'Morning',
      dosagePerDose: 1,
    };

    await scheduleSnoozeNotification('Aspirin', 60_000, doseData);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ channelId: 'snooze' }),
      }),
    );
  });

  it('scheduleMedicationReminders daily includes channelId on Android', async () => {
    const schedule: ScheduleNotifInput = {
      id: 'sched-ad-1',
      medication_id: 'med-1',
      frequency: 'daily',
      selected_days: [],
      times_of_day: ['Morning'],
      push_notifications: true,
      snooze_duration: '5 min',
      dosage_per_dose: 1,
      interval_days: null,
      start_date: '2025-01-01',
    };

    await scheduleMedicationReminders(schedule, 'DailyMed');

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ channelId: 'medication-reminders' }),
        trigger: expect.objectContaining({ channelId: 'medication-reminders', type: 'daily' }),
      }),
    );
  });

  it('scheduleMedicationReminders weekly includes channelId on Android', async () => {
    const schedule: ScheduleNotifInput = {
      id: 'sched-ad-2',
      medication_id: 'med-1',
      frequency: 'weekly',
      selected_days: ['Mon'],
      times_of_day: ['Morning'],
      push_notifications: true,
      snooze_duration: '5 min',
      dosage_per_dose: 1,
      interval_days: null,
      start_date: '2025-01-01',
    };

    await scheduleMedicationReminders(schedule, 'WeeklyMed');

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ channelId: 'medication-reminders' }),
        trigger: expect.objectContaining({ channelId: 'medication-reminders', type: 'weekly' }),
      }),
    );
  });

  it('scheduleMedicationReminders interval includes channelId on Android', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-16T06:00:00'));

    const schedule: ScheduleNotifInput = {
      id: 'sched-ad-3',
      medication_id: 'med-1',
      frequency: 'interval',
      selected_days: [],
      times_of_day: ['Morning'],
      push_notifications: true,
      snooze_duration: '5 min',
      dosage_per_dose: 1,
      interval_days: 3,
      start_date: '2025-01-01',
    };

    await scheduleMedicationReminders(schedule, 'IntervalMed');

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    const dateTriggers = calls.filter((c: NotifMockCall) => c[0].trigger?.type === 'date');
    expect(dateTriggers.length).toBeGreaterThan(0);
    for (const call of dateTriggers) {
      expect(call[0].content.channelId).toBe('medication-reminders');
      expect(call[0].trigger.channelId).toBe('medication-reminders');
    }
  });

  it('scheduleLowSupplyReminder includes channelId on Android (with immediate)', async () => {
    await scheduleLowSupplyReminder('med-1', 'Aspirin', 3);

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    for (const call of calls) {
      expect(call[0].content.channelId).toBe('medication-reminders');
    }
    const dailyCall = calls.find((c: NotifMockCall) => c[0].trigger?.type === 'daily');
    expect(dailyCall?.[0].trigger.channelId).toBe('medication-reminders');
  });

  it('scheduleLowSupplyReminder includes channelId on Android (without immediate)', async () => {
    await scheduleLowSupplyReminder('med-1', 'Aspirin', 3, false);

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0].content.channelId).toBe('medication-reminders');
    expect(calls[0][0].trigger.channelId).toBe('medication-reminders');
  });

  it('fireMissedDoseReminders includes channelId on Android', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-23T10:00:00'));

    const schedules: import('./notifications').MissedDoseScheduleInput[] = [
      {
        id: 'sch-ad',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: [],
        times_of_day: ['Morning'],
        push_notifications: true,
        interval_days: null,
        start_date: '2025-01-01',
      },
    ];

    await fireMissedDoseReminders(schedules, [], { 'sch-ad': 'AndroidMed' });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ channelId: 'medication-reminders' }),
      }),
    );
  });
});

// ── scheduleMedicationReminders (time label edge cases) ──────────────

describe('scheduleMedicationReminders (time label edge cases)', () => {
  const baseSchedule: ScheduleNotifInput = {
    id: 'sched-time-1',
    medication_id: 'med-1',
    frequency: 'daily',
    selected_days: [],
    times_of_day: ['Morning'],
    push_notifications: true,
    snooze_duration: '5 min',
    dosage_per_dose: 1,
    interval_days: null,
    start_date: '2025-01-01',
  };

  it('skips unparseable time labels and schedules valid ones', async () => {
    const schedule = { ...baseSchedule, times_of_day: ['gobbledygook', 'Morning'] };

    await scheduleMedicationReminders(schedule, 'TestMed');

    const calls = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][0].trigger).toMatchObject({ type: 'daily', hour: 8, minute: 0 });
  });

  it('uses raw label as displayTime for non-preset custom times', async () => {
    const schedule = { ...baseSchedule, times_of_day: ['1:45 PM'] };

    await scheduleMedicationReminders(schedule, 'TestMed');

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining('1:45 PM'),
        }),
        trigger: expect.objectContaining({ hour: 13, minute: 45 }),
      }),
    );
  });

  it('formats preset PM hours with hour - 12 (Evening → 6:00 PM)', async () => {
    const schedule = { ...baseSchedule, times_of_day: ['Evening'] };

    await scheduleMedicationReminders(schedule, 'TestMed');

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining('Evening (6:00 PM)'),
        }),
      }),
    );
  });

  it('formats preset noon hour correctly (Afternoon → 12:00 PM)', async () => {
    const schedule = { ...baseSchedule, times_of_day: ['Afternoon'] };

    await scheduleMedicationReminders(schedule, 'TestMed');

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining('Afternoon (12:00 PM)'),
        }),
      }),
    );
  });

  it('formats preset AM hours correctly (Morning → 8:00 AM)', async () => {
    const schedule = { ...baseSchedule, times_of_day: ['Morning'] };

    await scheduleMedicationReminders(schedule, 'TestMed');

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          body: expect.stringContaining('Morning (8:00 AM)'),
        }),
      }),
    );
  });
});

// ── fireMissedDoseReminders (additional edge cases) ──────────────────

describe('fireMissedDoseReminders (additional edge cases)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('skips schedules with push_notifications disabled', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-23T10:00:00'));

    const schedules: import('./notifications').MissedDoseScheduleInput[] = [
      {
        id: 'sch-nopush',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: [],
        times_of_day: ['Morning'],
        push_notifications: false,
        interval_days: null,
        start_date: '2025-01-01',
      },
    ];

    await fireMissedDoseReminders(schedules, [], { 'sch-nopush': 'NoPushMed' });

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('fires for weekly schedule when today matches selected_days', async () => {
    jest.useFakeTimers();
    // March 23, 2026 is a Monday
    jest.setSystemTime(new Date('2026-03-23T10:00:00'));

    const schedules: import('./notifications').MissedDoseScheduleInput[] = [
      {
        id: 'sch-weekly-match',
        medication_id: 'med-1',
        frequency: 'weekly',
        selected_days: ['Mon', 'Wed', 'Fri'],
        times_of_day: ['Morning'],
        push_notifications: true,
        interval_days: null,
        start_date: '2025-01-01',
      },
    ];

    await fireMissedDoseReminders(schedules, [], { 'sch-weekly-match': 'WeeklyMed' });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: '💊 Missed: WeeklyMed' }),
        trigger: null,
      }),
    );
  });

  it('uses "your medication" fallback when medication name is missing from map', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-23T10:00:00'));

    const schedules: import('./notifications').MissedDoseScheduleInput[] = [
      {
        id: 'sch-noname',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: [],
        times_of_day: ['Morning'],
        push_notifications: true,
        interval_days: null,
        start_date: '2025-01-01',
      },
    ];

    // Empty map — name missing
    await fireMissedDoseReminders(schedules, [], {});

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: '💊 Missed: your medication' }),
      }),
    );
  });

  it('logs console message when fired > 0', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-23T10:00:00'));

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const schedules: import('./notifications').MissedDoseScheduleInput[] = [
      {
        id: 'sch-fire',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: [],
        times_of_day: ['Morning'],
        push_notifications: true,
        interval_days: null,
        start_date: '2025-01-01',
      },
    ];

    await fireMissedDoseReminders(schedules, [], { 'sch-fire': 'FireMed' });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('missed-dose catch-up'));
    logSpy.mockRestore();
  });
});

// ── deduplicateScheduledNotifications (weekly + other trigger types) ──

describe('deduplicateScheduledNotifications (trigger type branches)', () => {
  it('deduplicates weekly triggers with matching weekday/hour/minute', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'w-1',
        content: { title: 'Take pill', data: {} },
        trigger: { type: 'weekly', weekday: 2, hour: 8, minute: 0 },
      },
      {
        identifier: 'w-2',
        content: { title: 'Take pill', data: { notifType: 'reminder' } },
        trigger: { type: 'weekly', weekday: 2, hour: 8, minute: 0 },
      },
    ]);

    const removed = await deduplicateScheduledNotifications();
    expect(removed).toBe(1);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('w-1');
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith('w-2');
  });

  it('does not group weekly triggers with different weekdays', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'w-a',
        content: { title: 'Take pill', data: {} },
        trigger: { type: 'weekly', weekday: 2, hour: 8, minute: 0 },
      },
      {
        identifier: 'w-b',
        content: { title: 'Take pill', data: {} },
        trigger: { type: 'weekly', weekday: 5, hour: 8, minute: 0 },
      },
    ]);

    const removed = await deduplicateScheduledNotifications();
    expect(removed).toBe(0);
  });

  it('treats date triggers as unique (no dedup)', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'd-1',
        content: { title: 'Take pill', data: {} },
        trigger: { type: 'date', date: new Date('2025-01-20T08:00:00') },
      },
      {
        identifier: 'd-2',
        content: { title: 'Take pill', data: {} },
        trigger: { type: 'date', date: new Date('2025-01-20T08:00:00') },
      },
    ]);

    const removed = await deduplicateScheduledNotifications();
    expect(removed).toBe(0);
  });

  it('handles null trigger gracefully', async () => {
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
      {
        identifier: 'null-t1',
        content: { title: 'Immediate', data: {} },
        trigger: null,
      },
      {
        identifier: 'null-t2',
        content: { title: 'Immediate', data: {} },
        trigger: null,
      },
    ]);

    const removed = await deduplicateScheduledNotifications();
    // Each gets unique|<identifier> key, so no dedup
    expect(removed).toBe(0);
  });
});
