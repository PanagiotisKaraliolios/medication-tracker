import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import { SNOOZE_STORAGE_KEY } from '../constants/storage';
import {
  addNotificationResponseListener,
  cancelSnoozeNotification,
  requestNotificationPermissions,
  scheduleSnoozeNotification,
} from '../lib/notifications';
import type { TodayDose } from '../utils/dose';
import { formatTimeLeft } from '../utils/snooze';
import { useSnooze } from './useSnooze';

// ── Mocks ────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-notifications');
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));
jest.mock('../lib/notifications', () => ({
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
  scheduleSnoozeNotification: jest.fn().mockResolvedValue('mock-notif-id'),
  cancelSnoozeNotification: jest.fn(),
  addNotificationResponseListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  SNOOZE_ACTION_TAKE: 'take',
  SNOOZE_ACTION_SNOOZE_AGAIN: 'snooze-again',
}));

// ── Helpers ──────────────────────────────────────────────────────────

const makeDose = (overrides: Partial<TodayDose> = {}): TodayDose => ({
  key: 'sched1-Morning',
  scheduleId: 'sched1',
  medicationId: 'med1',
  name: 'Aspirin',
  dosage: '100mg',
  form: 'tablet',
  icon: 'pill',
  timeLabel: 'Morning',
  time: '8:00 AM',
  sortOrder: 480,
  snoozeDuration: '10 min',
  dosagePerDose: 1,
  instructions: '',
  status: 'pending' as const,
  doseLogId: null,
  ...overrides,
});

function makeParams(overrides: Record<string, unknown> = {}) {
  return {
    selectedISO: '2025-01-15',
    loadDoses: jest.fn(),
    logDose: jest.fn().mockResolvedValue({ data: {}, error: null }),
    adjustSupply: jest.fn(),
    handleStatusChange: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useSnooze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initial snoozedUntil is empty', () => {
    const { result } = renderHook(() => useSnooze(makeParams()));

    expect(result.current.snoozedUntil).toEqual({});
  });

  it('handleSnoozeRequest sets snoozeDialogDose', () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose();

    act(() => {
      result.current.handleSnoozeRequest(dose);
    });

    expect(result.current.snoozeDialogDose).toEqual(dose);
  });

  it('handleSnoozeConfirm schedules notification and updates snoozedUntil', async () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose();

    // First set the dialog dose
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });

    // Then confirm
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(scheduleSnoozeNotification).toHaveBeenCalledWith(
      'Aspirin',
      600000, // 10 min in ms
      expect.objectContaining({
        doseKey: 'sched1-Morning',
        medicationId: 'med1',
        scheduleId: 'sched1',
      }),
    );
    expect(result.current.snoozedUntil['sched1-Morning']).toBeDefined();
    expect(result.current.snoozeDialogDose).toBeNull();
  });

  it('handleSnoozeConfirm shows "Already snoozed" toast when dose is already snoozed', async () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose();

    // Snooze the dose first
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    // Try to snooze again
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        text1: 'Already snoozed',
      }),
    );
  });

  it('handleSnoozeConfirm does nothing if snoozeDialogDose is null', async () => {
    const { result } = renderHook(() => useSnooze(makeParams()));

    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(scheduleSnoozeNotification).not.toHaveBeenCalled();
  });

  it('handleCancelSnooze cancels notification and removes from snoozedUntil', async () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose();

    // Snooze first
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(result.current.snoozedUntil['sched1-Morning']).toBeDefined();

    // Cancel
    act(() => {
      result.current.handleCancelSnooze(dose);
    });

    expect(cancelSnoozeNotification).toHaveBeenCalledWith('mock-notif-id');
    expect(result.current.snoozedUntil['sched1-Morning']).toBeUndefined();
  });

  it('handleTakeSnoozed calls handleStatusChange and removes from snoozedUntil', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useSnooze(params));
    const dose = makeDose();

    // Snooze first
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    // Take the snoozed dose
    await act(async () => {
      await result.current.handleTakeSnoozed(dose);
    });

    expect(params.handleStatusChange).toHaveBeenCalledWith(dose, 'taken');
    expect(cancelSnoozeNotification).toHaveBeenCalledWith('mock-notif-id');
    expect(result.current.snoozedUntil['sched1-Morning']).toBeUndefined();
  });

  it('loads persisted snooze state from AsyncStorage and filters expired', async () => {
    jest.useRealTimers();
    const now = Date.now();
    const stored = JSON.stringify({
      'sched1-Morning': now + 300000, // valid — 5 min from now
      'sched2-Evening': now - 10000, // expired
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(stored);

    const { result } = renderHook(() => useSnooze(makeParams()));

    await waitFor(() => {
      expect(Object.keys(result.current.snoozedUntil).length).toBe(1);
    });

    expect(result.current.snoozedUntil['sched1-Morning']).toBe(now + 300000);
    expect(result.current.snoozedUntil['sched2-Evening']).toBeUndefined();
  });

  it('persists snoozedUntil to AsyncStorage on change', async () => {
    jest.useRealTimers();
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose();

    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        SNOOZE_STORAGE_KEY,
        expect.stringContaining('sched1-Morning'),
      );
    });
  });

  it('removes empty snoozedUntil from AsyncStorage', async () => {
    jest.useRealTimers();
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose();

    // Snooze then cancel
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });
    act(() => {
      result.current.handleCancelSnooze(dose);
    });

    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(SNOOZE_STORAGE_KEY);
    });
  });

  it('returns formatTimeLeft function', () => {
    const { result } = renderHook(() => useSnooze(makeParams()));

    expect(result.current.formatTimeLeft).toBe(formatTimeLeft);
  });

  it('requests notification permissions on mount', () => {
    renderHook(() => useSnooze(makeParams()));

    expect(requestNotificationPermissions).toHaveBeenCalled();
  });

  it('sets up notification response listener on mount', () => {
    renderHook(() => useSnooze(makeParams()));

    expect(addNotificationResponseListener).toHaveBeenCalled();
  });

  it('handleSnoozeConfirm shows success toast with duration', async () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose();

    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        text1: 'Dose snoozed',
        text2: expect.stringContaining('10 min'),
      }),
    );
  });

  it('handleCancelSnooze works even if no notification was scheduled', () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose();

    // Cancel without prior snooze — should not throw
    act(() => {
      result.current.handleCancelSnooze(dose);
    });

    expect(cancelSnoozeNotification).not.toHaveBeenCalled();
    expect(result.current.snoozedUntil['sched1-Morning']).toBeUndefined();
  });

  // ── Notification response handler tests ──────────────────────────

  describe('notification response handler', () => {
    function getNotificationHandler(): (response: unknown) => Promise<void> {
      return (addNotificationResponseListener as jest.Mock).mock.calls[0][0];
    }

    function makeNotificationResponse(
      actionId: string,
      data: Record<string, unknown>,
      identifier = 'delivered-notif-1',
    ) {
      return {
        actionIdentifier: actionId,
        notification: {
          request: {
            identifier,
            content: { data },
          },
        },
      };
    }

    it('Take action: logs dose, adjusts supply, shows toast, reloads', async () => {
      const params = makeParams();
      renderHook(() => useSnooze(params));
      const handler = getNotificationHandler();

      await act(async () => {
        await handler(
          makeNotificationResponse('take', {
            doseKey: 'sched1-Morning',
            scheduleId: 'sched1',
            medicationId: 'med1',
            medicationName: 'Aspirin',
            timeLabel: 'Morning',
            dosagePerDose: 1,
            snoozeDuration: '10 min',
          }),
        );
      });

      expect(params.logDose).toHaveBeenCalledWith(
        'sched1',
        'med1',
        '2025-01-15',
        'Morning',
        'taken',
      );
      expect(params.adjustSupply).toHaveBeenCalledWith('med1', -1);
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Dose taken', text2: 'Aspirin' }),
      );
      expect(params.loadDoses).toHaveBeenCalled();
    });

    it('Take action without dosagePerDose does not adjust supply', async () => {
      const params = makeParams();
      renderHook(() => useSnooze(params));
      const handler = getNotificationHandler();

      await act(async () => {
        await handler(
          makeNotificationResponse('take', {
            doseKey: 'sched1-Morning',
            scheduleId: 'sched1',
            medicationId: 'med1',
            medicationName: 'Aspirin',
            timeLabel: 'Morning',
            dosagePerDose: undefined,
            snoozeDuration: '10 min',
          }),
        );
      });

      expect(params.logDose).toHaveBeenCalled();
      expect(params.adjustSupply).not.toHaveBeenCalled();
    });

    it('Snooze Again action: dismisses notification, reschedules, shows toast', async () => {
      (Notifications.dismissNotificationAsync as jest.Mock).mockResolvedValue(undefined);
      const params = makeParams();
      const { result } = renderHook(() => useSnooze(params));
      const handler = getNotificationHandler();

      await act(async () => {
        await handler(
          makeNotificationResponse('snooze-again', {
            doseKey: 'sched1-Morning',
            scheduleId: 'sched1',
            medicationId: 'med1',
            medicationName: 'Aspirin',
            timeLabel: 'Morning',
            dosagePerDose: 1,
            snoozeDuration: '10 min',
          }),
        );
      });

      expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('delivered-notif-1');
      expect(scheduleSnoozeNotification).toHaveBeenCalledWith(
        'Aspirin',
        600000,
        expect.objectContaining({ doseKey: 'sched1-Morning' }),
      );
      expect(result.current.snoozedUntil['sched1-Morning']).toBeDefined();
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Snoozed again' }),
      );
    });

    it('no-op when response data has no doseKey', async () => {
      const params = makeParams();
      renderHook(() => useSnooze(params));
      const handler = getNotificationHandler();

      await act(async () => {
        await handler(makeNotificationResponse('take', {}));
      });

      expect(params.logDose).not.toHaveBeenCalled();
      expect(params.loadDoses).not.toHaveBeenCalled();
    });
  });

  // ── Timer expiration ─────────────────────────────────────────────

  it('timer expires snoozed dose after duration elapses', async () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose({ snoozeDuration: '10 min' });

    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(result.current.snoozedUntil['sched1-Morning']).toBeDefined();

    // Advance system time past the stored `until`, then tick the interval
    const until = result.current.snoozedUntil['sched1-Morning'];
    jest.setSystemTime(new Date(until + 1000));
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.snoozedUntil['sched1-Morning']).toBeUndefined();
  });

  // ── Re-snooze cancels previous notification ─────────────────────

  it('handleSnoozeConfirm cancels previous notification when re-snoozing', async () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose({ snoozeDuration: '10 min' });

    // Snooze the dose a first time
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(scheduleSnoozeNotification).toHaveBeenCalledTimes(1);

    // Advance system time past the stored `until`, then tick the interval
    const until = result.current.snoozedUntil['sched1-Morning'];
    jest.setSystemTime(new Date(until + 1000));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.snoozedUntil['sched1-Morning']).toBeUndefined();

    // Snooze the same dose again — should cancel old notification
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(cancelSnoozeNotification).toHaveBeenCalledWith('mock-notif-id');
    expect(scheduleSnoozeNotification).toHaveBeenCalledTimes(2);
  });

  // ── scheduleSnoozeNotification failure ───────────────────────────

  it('handleSnoozeConfirm still shows toast when scheduleSnoozeNotification fails', async () => {
    (scheduleSnoozeNotification as jest.Mock).mockRejectedValueOnce(new Error('notif error'));
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose();

    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(result.current.snoozedUntil['sched1-Morning']).toBeDefined();
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', text1: 'Dose snoozed' }),
    );
  });

  // ── Persisted state cleanup ─────────────────────────────────────

  it('saves filtered entries to AsyncStorage when some persisted snoozes expired', async () => {
    jest.useRealTimers();
    const now = Date.now();
    const validUntil = now + 300000;
    const stored = JSON.stringify({
      'sched1-Morning': validUntil,
      'sched2-Evening': now - 10000,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(stored);

    renderHook(() => useSnooze(makeParams()));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        SNOOZE_STORAGE_KEY,
        JSON.stringify({ 'sched1-Morning': validUntil }),
      );
    });
  });

  // ── Snooze Again with prior notification (line 80) ──────────────

  it('Snooze Again action cancels previous notification when one exists', async () => {
    (Notifications.dismissNotificationAsync as jest.Mock).mockResolvedValue(undefined);
    const params = makeParams();
    const { result } = renderHook(() => useSnooze(params));
    const dose = makeDose();

    // First snooze via handleSnoozeConfirm to store a notif ID in the ref
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    // Now trigger snooze-again notification action for the same dose
    const handler = (addNotificationResponseListener as jest.Mock).mock.calls[0][0];
    await act(async () => {
      await handler({
        actionIdentifier: 'snooze-again',
        notification: {
          request: {
            identifier: 'delivered-notif-2',
            content: {
              data: {
                doseKey: 'sched1-Morning',
                scheduleId: 'sched1',
                medicationId: 'med1',
                medicationName: 'Aspirin',
                timeLabel: 'Morning',
                dosagePerDose: 1,
                snoozeDuration: '10 min',
              },
            },
          },
        },
      });
    });

    // Should have cancelled the previous notification from handleSnoozeConfirm
    expect(cancelSnoozeNotification).toHaveBeenCalledWith('mock-notif-id');
  });

  // ── Timer clears interval when snoozedUntil becomes empty (line 160) ──

  it('timer clears interval when snoozed dose is cancelled', async () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose();

    // Snooze to start the interval
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(result.current.snoozedUntil['sched1-Morning']).toBeDefined();

    // Tick the interval at least once to ensure it's running
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Cancel the snooze — snoozedUntil becomes empty, timer effect re-runs
    // and hits the `if (tickRef.current) { clearInterval(...) }` branch
    act(() => {
      result.current.handleCancelSnooze(dose);
    });

    expect(result.current.snoozedUntil['sched1-Morning']).toBeUndefined();

    // Advance timers again — no interval should fire (no errors)
    act(() => {
      jest.advanceTimersByTime(5000);
    });
  });

  // ── Restore: all entries expired → setItem with empty object (lines 146-147) ──

  it('restore persisted state calls setItem to clean up when all entries expired', async () => {
    jest.useRealTimers();
    const now = Date.now();
    const stored = JSON.stringify({
      'sched1-Morning': now - 60000,
      'sched2-Evening': now - 10000,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(stored);

    renderHook(() => useSnooze(makeParams()));

    // All expired: valid = {}, parsed has 2 keys → setItem called with empty object
    await waitFor(() => {
      // The restore effect (line 146-147) calls setItem with the filtered (empty) valid entries
      // The persist effect also calls removeItem (since snoozedUntil stays {}), so we need
      // to check setItem specifically
      const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const cleanupCall = setItemCalls.find(
        (call: string[]) => call[0] === SNOOZE_STORAGE_KEY && call[1] === JSON.stringify({}),
      );
      expect(cleanupCall).toBeDefined();
    });
  });

  // ── Branch coverage: durationMs < 60000 ternary ─────────────────

  it('handleSnoozeConfirm shows seconds label when snoozeDuration < 1 min', async () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose({ snoozeDuration: '30s' });

    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        text1: 'Dose snoozed',
        text2: expect.stringContaining('30s'),
      }),
    );
  });

  it('snooze-again notification action shows seconds label when duration < 1 min', async () => {
    (Notifications.dismissNotificationAsync as jest.Mock).mockResolvedValue(undefined);
    const params = makeParams();
    renderHook(() => useSnooze(params));
    const handler = (addNotificationResponseListener as jest.Mock).mock.calls[0][0];

    await act(async () => {
      await handler({
        actionIdentifier: 'snooze-again',
        notification: {
          request: {
            identifier: 'delivered-notif-short',
            content: {
              data: {
                doseKey: 'sched1-Morning',
                scheduleId: 'sched1',
                medicationId: 'med1',
                medicationName: 'Aspirin',
                timeLabel: 'Morning',
                dosagePerDose: 1,
                snoozeDuration: '30s',
              },
            },
          },
        },
      });
    });

    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        text1: 'Snoozed again',
        text2: expect.stringContaining('30s'),
      }),
    );
  });

  // ── Branch coverage: already snoozed with expired entry ─────────

  it('re-snoozes when snoozedUntil entry exists but has expired', async () => {
    const { result } = renderHook(() => useSnooze(makeParams()));
    const dose = makeDose({ snoozeDuration: '10 min' });

    // Snooze the dose
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    const firstUntil = result.current.snoozedUntil['sched1-Morning'];
    expect(firstUntil).toBeDefined();

    // Advance past expiration so the entry is expired but might not be cleaned up yet
    jest.setSystemTime(new Date(firstUntil + 1000));
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // The timer should have cleaned it up
    expect(result.current.snoozedUntil['sched1-Morning']).toBeUndefined();

    // Snooze again — should succeed (not show "Already snoozed")
    act(() => {
      result.current.handleSnoozeRequest(dose);
    });
    await act(async () => {
      await result.current.handleSnoozeConfirm();
    });

    // Should show "Dose snoozed" not "Already snoozed"
    const lastToastCall = (Toast.show as jest.Mock).mock.calls.at(-1)[0];
    expect(lastToastCall.text1).toBe('Dose snoozed');
    expect(result.current.snoozedUntil['sched1-Morning']).toBeDefined();
  });
});
