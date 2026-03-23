import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import type React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  cancelLowSupplyReminder,
  cancelMedicationReminders,
  scheduleLowSupplyReminder,
  scheduleMedicationReminders,
} from '../lib/notifications';
import { fetchAndUpdateWidget } from '../lib/widgetBridge';
import {
  useAdjustSupply,
  useCreateMedication,
  useCreateSchedule,
  useDeleteDoseLog,
  useDeleteMedication,
  useDeleteSchedule,
  useDeleteSymptom,
  useDoseLogsByDate,
  useDoseLogsByRange,
  useLogDose,
  useLogSymptom,
  useMedication,
  useMedications,
  usePrnLogs,
  useSchedule,
  useSchedules,
  useSchedulesByMedication,
  useSymptomsByDate,
  useSymptomsByRange,
  useSymptomsByMedication,
  useDeleteSymptomsByDate,
  useUpdateMedication,
  useUpdateSchedule,
} from './useQueryHooks';

// ── Chainable Supabase mock ──────────────────────────────────────────

function createChain(resolvedValue: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, jest.Mock> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'gte', 'lte', 'is', 'order', 'single'];
  for (const m of methods) {
    chain[m] = jest.fn().mockReturnValue(chain);
  }
  chain.single = jest.fn().mockResolvedValue(resolvedValue);
  Object.defineProperty(chain, 'then', {
    value: (resolve: (v: unknown) => void) => resolve(resolvedValue),
    configurable: true,
  });
  return chain;
}

// ── Module mocks ─────────────────────────────────────────────────────

const mockFrom = jest.fn();
jest.mock('../lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const mockUser = { id: 'user-123', email: 'test@test.com' };
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: mockUser, session: { user: mockUser } })),
}));

jest.mock('../lib/notifications', () => ({
  scheduleMedicationReminders: jest.fn().mockResolvedValue(undefined),
  cancelMedicationReminders: jest.fn().mockResolvedValue(undefined),
  scheduleLowSupplyReminder: jest.fn().mockResolvedValue(undefined),
  cancelLowSupplyReminder: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../lib/widgetBridge', () => ({
  fetchAndUpdateWidget: jest.fn(),
}));
jest.mock('../stores/draftStores', () => ({
  useMedicationDraft: jest.fn((selector: (state: unknown) => unknown) =>
    selector({
      draft: {
        name: 'Test Med',
        dosage: '100mg',
        form: 'tablet',
        icon: 'pill',
        currentSupply: 30,
        lowSupplyThreshold: 5,
        isPrn: false,
        rxcui: null,
        genericName: null,
      },
    }),
  ),
}));

jest.mock('../lib/queryKeys', () => ({
  queryKeys: {
    medications: {
      all: ['medications'],
      detail: (id: string) => ['medications', id],
    },
    schedules: {
      all: ['schedules'],
      byMedication: (id: string) => ['schedules', 'byMedication', id],
      detail: (id: string) => ['schedules', 'detail', id],
    },
    doseLogs: {
      all: ['doseLogs'],
      byDate: (date: string) => ['doseLogs', 'byDate', date],
      byRange: (s: string, e: string) => ['doseLogs', 'byRange', s, e],
      prnByMedication: (id: string) => ['doseLogs', 'prn', id],
    },
    symptoms: {
      all: ['symptoms'],
      byDate: (date: string) => ['symptoms', 'byDate', date],
      byRange: (s: string, e: string) => ['symptoms', 'byRange', s, e],
      byMedication: (id: string) => ['symptoms', 'byMedication', id],
    },
    profile: { current: ['profile'] },
  },
}));

jest.mock('../utils/date', () => ({
  toISO: jest.fn(() => '2025-01-15'),
}));

// ── Test wrapper ─────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('useQueryHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      user: mockUser,
      session: { user: mockUser },
    } as ReturnType<typeof useAuth>);
  });

  // ── Query hooks ──────────────────────────────────────────────────

  describe('useMedications', () => {
    it('fetches active medications with correct filters', async () => {
      const chain = createChain({ data: [{ id: 'med-1', name: 'Aspirin' }], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useMedications(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('medications');
      expect(chain.select).toHaveBeenCalledWith('*');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
      expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('useMedication', () => {
    it('fetches a single medication by id', async () => {
      const chain = createChain({ data: { id: 'med-1', name: 'Aspirin' }, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useMedication('med-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('medications');
      expect(chain.eq).toHaveBeenCalledWith('id', 'med-1');
      expect(chain.single).toHaveBeenCalled();
    });
  });

  describe('useSchedules', () => {
    it('fetches active schedules', async () => {
      const chain = createChain({ data: [{ id: 'sched-1' }], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSchedules(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('schedules');
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  describe('useSchedulesByMedication', () => {
    it('fetches schedules filtered by medication id', async () => {
      const chain = createChain({ data: [{ id: 'sched-1' }], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSchedulesByMedication('med-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(chain.eq).toHaveBeenCalledWith('medication_id', 'med-1');
    });
  });

  describe('useSchedule', () => {
    it('fetches a single schedule by id', async () => {
      const chain = createChain({ data: { id: 'sched-1' }, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSchedule('sched-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(chain.eq).toHaveBeenCalledWith('id', 'sched-1');
      expect(chain.single).toHaveBeenCalled();
    });
  });

  describe('useDoseLogsByDate', () => {
    it('fetches dose logs for a specific date', async () => {
      const chain = createChain({ data: [{ id: 'log-1' }], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDoseLogsByDate('2025-01-15'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('dose_logs');
      expect(chain.eq).toHaveBeenCalledWith('scheduled_date', '2025-01-15');
    });
  });

  describe('useDoseLogsByRange', () => {
    it('fetches dose logs for a date range', async () => {
      const chain = createChain({ data: [{ id: 'log-1' }], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDoseLogsByRange('2025-01-01', '2025-01-31'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('dose_logs');
      expect(chain.gte).toHaveBeenCalledWith('scheduled_date', '2025-01-01');
      expect(chain.lte).toHaveBeenCalledWith('scheduled_date', '2025-01-31');
    });
  });

  describe('usePrnLogs', () => {
    it('filters with is(schedule_id, null)', async () => {
      const chain = createChain({ data: [{ id: 'prn-1' }], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => usePrnLogs('med-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(chain.is).toHaveBeenCalledWith('schedule_id', null);
      expect(chain.eq).toHaveBeenCalledWith('medication_id', 'med-1');
    });
  });

  describe('useSymptomsByDate', () => {
    it('fetches symptoms filtered by logged_date', async () => {
      const chain = createChain({ data: [{ id: 'sym-1' }], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByDate('2025-01-15'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('symptoms');
      expect(chain.eq).toHaveBeenCalledWith('logged_date', '2025-01-15');
    });
  });

  describe('query hooks disabled when user is null', () => {
    it('does not fetch when user is null', () => {
      jest.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
      } as ReturnType<typeof useAuth>);

      const chain = createChain({ data: [], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useMedications(), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  // ── Mutation hooks ───────────────────────────────────────────────

  describe('useCreateMedication', () => {
    it('inserts with correct snake_case mapping and invalidates', async () => {
      const chain = createChain({
        data: { id: 'new-med', name: 'Test Med', user_id: 'user-123' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useCreateMedication(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(mockFrom).toHaveBeenCalledWith('medications');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          name: 'Test Med',
          dosage: '100mg',
          form: 'tablet',
          icon: 'pill',
          current_supply: 30,
          low_supply_threshold: 5,
          is_prn: false,
        }),
      );
      expect(chain.select).toHaveBeenCalled();
      expect(chain.single).toHaveBeenCalled();
    });
  });

  describe('useUpdateMedication', () => {
    it('updates by id and invalidates correct keys', async () => {
      const chain = createChain({
        data: { id: 'med-1', name: 'Updated', user_id: 'user-123' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useUpdateMedication(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'med-1', updates: { name: 'Updated' } });
      });

      expect(mockFrom).toHaveBeenCalledWith('medications');
      expect(chain.update).toHaveBeenCalledWith({ name: 'Updated' });
      expect(chain.eq).toHaveBeenCalledWith('id', 'med-1');
    });
  });

  describe('useDeleteMedication', () => {
    it('deletes medication and cancels notifications for all schedules', async () => {
      // First call: fetch schedules for the medication
      const scheduleChain = createChain({
        data: [{ id: 'sched-1' }, { id: 'sched-2' }],
        error: null,
      });
      // Second call: delete the medication
      const deleteChain = createChain({ data: null, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return scheduleChain;
        return deleteChain;
      });

      const { result } = renderHook(() => useDeleteMedication(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('med-1');
      });

      expect(mockFrom).toHaveBeenCalledWith('schedules');
      expect(mockFrom).toHaveBeenCalledWith('medications');
      expect(cancelMedicationReminders).toHaveBeenCalledWith('sched-1');
      expect(cancelMedicationReminders).toHaveBeenCalledWith('sched-2');
    });
  });

  describe('useAdjustSupply', () => {
    it('adjusts supply and triggers low-supply reminder when threshold met', async () => {
      // First call: fetch current supply
      const fetchChain = createChain({
        data: { current_supply: 6, low_supply_threshold: 5, name: 'Aspirin' },
        error: null,
      });
      // Second call: update supply
      const updateChain = createChain({ data: null, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchChain;
        return updateChain;
      });

      const { result } = renderHook(() => useAdjustSupply(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ medicationId: 'med-1', delta: -1 });
      });

      expect(updateChain.update).toHaveBeenCalledWith({ current_supply: 5 });
      expect(scheduleLowSupplyReminder).toHaveBeenCalledWith('med-1', 'Aspirin', 5);
    });

    it('cancels low-supply reminder when supply is above threshold', async () => {
      const fetchChain = createChain({
        data: { current_supply: 5, low_supply_threshold: 5, name: 'Aspirin' },
        error: null,
      });
      const updateChain = createChain({ data: null, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchChain;
        return updateChain;
      });

      const { result } = renderHook(() => useAdjustSupply(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ medicationId: 'med-1', delta: 5 });
      });

      expect(updateChain.update).toHaveBeenCalledWith({ current_supply: 10 });
      expect(cancelLowSupplyReminder).toHaveBeenCalledWith('med-1');
    });

    it('clamps supply at zero', async () => {
      const fetchChain = createChain({
        data: { current_supply: 2, low_supply_threshold: 5, name: 'Aspirin' },
        error: null,
      });
      const updateChain = createChain({ data: null, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchChain;
        return updateChain;
      });

      const { result } = renderHook(() => useAdjustSupply(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ medicationId: 'med-1', delta: -10 });
      });

      expect(updateChain.update).toHaveBeenCalledWith({ current_supply: 0 });
    });
  });

  describe('useCreateSchedule', () => {
    it('inserts schedule, schedules OS notifications, and calls fetchAndUpdateWidget', async () => {
      const scheduleRow = {
        id: 'sched-new',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: ['Mon'],
        times_of_day: ['Morning'],
        push_notifications: true,
        snooze_duration: '5 min',
        dosage_per_dose: 1,
        interval_days: null,
        start_date: '2025-01-15',
      };
      // Insert schedule chain
      const insertChain = createChain({ data: scheduleRow, error: null });
      // Fetch med name chain
      const medChain = createChain({ data: { name: 'Aspirin' }, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return insertChain;
        return medChain;
      });

      const { result } = renderHook(() => useCreateSchedule(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          medicationId: 'med-1',
          scheduleDraft: {
            frequency: 'Daily',
            selectedDays: ['Mon'],
            timesOfDay: ['Morning'],
            dosagePerDose: 1,
            pushNotifications: true,
            smsAlerts: false,
            snoozeDuration: '5 min',
            instructions: '',
            startDate: '2025-01-15',
            endDate: null,
            intervalDays: null,
          },
        });
      });

      expect(mockFrom).toHaveBeenCalledWith('schedules');
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          medication_id: 'med-1',
          user_id: 'user-123',
          frequency: 'daily',
        }),
      );
      expect(scheduleMedicationReminders).toHaveBeenCalled();
      expect(fetchAndUpdateWidget).toHaveBeenCalledWith('user-123');
    });
  });

  describe('useUpdateSchedule', () => {
    it('updates schedule and reschedules notifications', async () => {
      const updatedRow = {
        id: 'sched-1',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: ['Mon', 'Tue'],
        times_of_day: ['Morning'],
        push_notifications: true,
        snooze_duration: '5 min',
        dosage_per_dose: 1,
        interval_days: null,
        start_date: '2025-01-15',
      };
      const updateChain = createChain({ data: updatedRow, error: null });
      const medChain = createChain({ data: { name: 'Aspirin' }, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return updateChain;
        return medChain;
      });

      const { result } = renderHook(() => useUpdateSchedule(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'sched-1',
          updates: { selected_days: ['Mon', 'Tue'] },
        });
      });

      expect(updateChain.update).toHaveBeenCalledWith({ selected_days: ['Mon', 'Tue'] });
      expect(scheduleMedicationReminders).toHaveBeenCalled();
      expect(fetchAndUpdateWidget).toHaveBeenCalledWith('user-123');
    });
  });

  describe('useDeleteSchedule', () => {
    it('deletes schedule and cancels notifications', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDeleteSchedule(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('sched-1');
      });

      expect(cancelMedicationReminders).toHaveBeenCalledWith('sched-1');
      expect(mockFrom).toHaveBeenCalledWith('schedules');
      expect(chain.delete).toHaveBeenCalled();
      expect(fetchAndUpdateWidget).toHaveBeenCalledWith('user-123');
    });
  });

  describe('useLogDose', () => {
    it('inserts PRN dose (scheduleId null)', async () => {
      const chain = createChain({
        data: { id: 'log-1', schedule_id: null, medication_id: 'med-1' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useLogDose(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          scheduleId: null,
          medicationId: 'med-1',
          date: '2025-01-15',
          timeLabel: 'As Needed',
          status: 'taken',
        });
      });

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule_id: null,
          medication_id: 'med-1',
          status: 'taken',
        }),
      );
    });

    it('upserts scheduled dose', async () => {
      const chain = createChain({
        data: { id: 'log-2', schedule_id: 'sched-1', medication_id: 'med-1' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useLogDose(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          scheduleId: 'sched-1',
          medicationId: 'med-1',
          date: '2025-01-15',
          timeLabel: 'Morning',
          status: 'taken',
        });
      });

      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule_id: 'sched-1',
          status: 'taken',
        }),
        { onConflict: 'schedule_id,scheduled_date,time_label' },
      );
    });
  });

  describe('useDeleteDoseLog', () => {
    it('deletes dose log by id', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDeleteDoseLog(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('log-1');
      });

      expect(mockFrom).toHaveBeenCalledWith('dose_logs');
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'log-1');
      expect(fetchAndUpdateWidget).toHaveBeenCalledWith('user-123');
    });
  });

  describe('useLogSymptom', () => {
    it('inserts symptom with correct fields', async () => {
      const chain = createChain({
        data: { id: 'sym-1', name: 'Headache', severity: 'moderate' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useLogSymptom(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Headache',
          severity: 'moderate',
          medicationId: 'med-1',
          notes: 'After lunch',
        });
      });

      expect(mockFrom).toHaveBeenCalledWith('symptoms');
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          name: 'Headache',
          severity: 'moderate',
          medication_id: 'med-1',
          notes: 'After lunch',
        }),
      );
    });
  });

  describe('useDeleteSymptom', () => {
    it('deletes symptom by id', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDeleteSymptom(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('sym-1');
      });

      expect(mockFrom).toHaveBeenCalledWith('symptoms');
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'sym-1');
    });
  });

  describe('mutation error handling', () => {
    it('throws when user is not authenticated', async () => {
      jest.mocked(useAuth).mockReturnValue({
        user: null,
        session: null,
      } as ReturnType<typeof useAuth>);

      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useUpdateMedication(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ id: 'med-1', updates: { name: 'X' } });
        }),
      ).rejects.toThrow('Not authenticated');
    });

    it('throws on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDeleteSchedule(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync('sched-1');
        }),
      ).rejects.toThrow('DB error');
    });
  });

  // ── Additional coverage tests ────────────────────────────────────

  describe('useAdjustSupply – fetch error', () => {
    it('throws when the initial medication fetch returns an error', async () => {
      const fetchChain = createChain({ data: null, error: { message: 'fetch failed' } });
      mockFrom.mockReturnValue(fetchChain);

      const { result } = renderHook(() => useAdjustSupply(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ medicationId: 'med-1', delta: -1 });
        }),
      ).rejects.toThrow('fetch failed');
    });
  });

  describe('useCreateSchedule – notification failure tolerance', () => {
    it('succeeds even when scheduleMedicationReminders rejects', async () => {
      const { scheduleMedicationReminders: mockSchedule } = require('../lib/notifications');
      mockSchedule.mockRejectedValueOnce(new Error('notif error'));

      const scheduleRow = {
        id: 'sched-new',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: ['Mon'],
        times_of_day: ['Morning'],
        push_notifications: true,
        snooze_duration: '5 min',
        dosage_per_dose: 1,
        interval_days: null,
        start_date: '2025-01-15',
      };
      const insertChain = createChain({ data: scheduleRow, error: null });
      const medChain = createChain({ data: { name: 'Aspirin' }, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return insertChain;
        return medChain;
      });

      const { result } = renderHook(() => useCreateSchedule(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          medicationId: 'med-1',
          scheduleDraft: {
            frequency: 'Daily',
            selectedDays: ['Mon'],
            timesOfDay: ['Morning'],
            dosagePerDose: 1,
            pushNotifications: true,
            smsAlerts: false,
            snoozeDuration: '5 min',
            instructions: '',
            startDate: '2025-01-15',
            endDate: null,
            intervalDays: null,
          },
        });
      });

      // Mutation should resolve without throwing
      expect(insertChain.insert).toHaveBeenCalled();
    });
  });

  describe('useUpdateSchedule – notification failure tolerance', () => {
    it('succeeds even when scheduleMedicationReminders rejects', async () => {
      const { scheduleMedicationReminders: mockSchedule } = require('../lib/notifications');
      mockSchedule.mockRejectedValueOnce(new Error('notif error'));

      const updatedRow = {
        id: 'sched-1',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: ['Mon', 'Tue'],
        times_of_day: ['Morning'],
        push_notifications: true,
        snooze_duration: '5 min',
        dosage_per_dose: 1,
        interval_days: null,
        start_date: '2025-01-15',
      };
      const updateChain = createChain({ data: updatedRow, error: null });
      const medChain = createChain({ data: { name: 'Aspirin' }, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return updateChain;
        return medChain;
      });

      const { result } = renderHook(() => useUpdateSchedule(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'sched-1',
          updates: { selected_days: ['Mon', 'Tue'] },
        });
      });

      // Mutation should resolve without throwing
      expect(updateChain.update).toHaveBeenCalledWith({ selected_days: ['Mon', 'Tue'] });
    });
  });

  describe('useSymptomsByRange', () => {
    it('fetches symptoms with gte/lte on logged_date', async () => {
      const chain = createChain({ data: [{ id: 'sym-1' }], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByRange('2025-01-01', '2025-01-31'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('symptoms');
      expect(chain.gte).toHaveBeenCalledWith('logged_date', '2025-01-01');
      expect(chain.lte).toHaveBeenCalledWith('logged_date', '2025-01-31');
      expect(chain.order).toHaveBeenCalledWith('logged_at', { ascending: false });
    });
  });

  describe('useSymptomsByMedication', () => {
    it('fetches symptoms filtered by medication_id', async () => {
      const chain = createChain({ data: [{ id: 'sym-2' }], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByMedication('med-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('symptoms');
      expect(chain.eq).toHaveBeenCalledWith('medication_id', 'med-1');
      expect(chain.order).toHaveBeenCalledWith('logged_at', { ascending: false });
    });
  });

  describe('useDeleteSymptomsByDate', () => {
    it('deletes symptoms by date and user_id', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDeleteSymptomsByDate(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('2025-01-15');
      });

      expect(mockFrom).toHaveBeenCalledWith('symptoms');
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(chain.eq).toHaveBeenCalledWith('logged_date', '2025-01-15');
    });
  });

  describe('usePrnLogs – with date filters', () => {
    it('calls gte and lte when startDate and endDate are provided', async () => {
      const chain = createChain({ data: [{ id: 'prn-1' }], error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => usePrnLogs('med-1', '2025-01-01', '2025-01-31'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(chain.is).toHaveBeenCalledWith('schedule_id', null);
      expect(chain.eq).toHaveBeenCalledWith('medication_id', 'med-1');
      expect(chain.gte).toHaveBeenCalledWith('scheduled_date', '2025-01-01');
      expect(chain.lte).toHaveBeenCalledWith('scheduled_date', '2025-01-31');
    });
  });

  // ── Branch coverage: query hooks – error responses ───────────────

  describe('query hooks - error responses', () => {
    it('useMedications enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useMedications(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });

    it('useMedication enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useMedication('med-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });

    it('useSchedules enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSchedules(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });

    it('useSchedulesByMedication enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSchedulesByMedication('med-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });

    it('useSchedule enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSchedule('sched-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });

    it('useDoseLogsByDate enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDoseLogsByDate('2025-01-15'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });

    it('useDoseLogsByRange enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDoseLogsByRange('2025-01-01', '2025-01-31'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });

    it('useSymptomsByDate enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByDate('2025-01-15'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });

    it('useSymptomsByRange enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByRange('2025-01-01', '2025-01-31'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });

    it('useSymptomsByMedication enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByMedication('med-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });

    it('usePrnLogs enters error state on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => usePrnLogs('med-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('DB error');
    });
  });

  // ── Branch coverage: query hooks – null data fallback ────────────

  describe('query hooks - null data fallback', () => {
    it('useMedications returns [] when data is null', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useMedications(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('useSchedules returns [] when data is null', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSchedules(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('useSchedulesByMedication returns [] when data is null', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSchedulesByMedication('med-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('useDoseLogsByDate returns [] when data is null', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDoseLogsByDate('2025-01-15'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('useDoseLogsByRange returns [] when data is null', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDoseLogsByRange('2025-01-01', '2025-01-31'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('useSymptomsByDate returns [] when data is null', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByDate('2025-01-15'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('useSymptomsByRange returns [] when data is null', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByRange('2025-01-01', '2025-01-31'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('useSymptomsByMedication returns [] when data is null', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByMedication('med-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });

    it('usePrnLogs returns [] when data is null', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => usePrnLogs('med-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  // ── Branch coverage: mutation hooks – not authenticated ──────────

  describe('mutation hooks - not authenticated', () => {
    beforeEach(() => {
      jest.mocked(useAuth).mockReturnValue({ user: null, session: null } as ReturnType<typeof useAuth>);
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);
    });

    it('useCreateMedication throws Not authenticated', async () => {
      const { result } = renderHook(() => useCreateMedication(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync(); }),
      ).rejects.toThrow('Not authenticated');
    });

    it('useDeleteMedication throws Not authenticated', async () => {
      const { result } = renderHook(() => useDeleteMedication(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync('med-1'); }),
      ).rejects.toThrow('Not authenticated');
    });

    it('useAdjustSupply throws Not authenticated', async () => {
      const { result } = renderHook(() => useAdjustSupply(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync({ medicationId: 'med-1', delta: -1 }); }),
      ).rejects.toThrow('Not authenticated');
    });

    it('useCreateSchedule throws Not authenticated', async () => {
      const { result } = renderHook(() => useCreateSchedule(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            medicationId: 'med-1',
            scheduleDraft: {
              frequency: 'Daily',
              selectedDays: ['Mon'],
              timesOfDay: ['Morning'],
              dosagePerDose: 1,
              pushNotifications: true,
              smsAlerts: false,
              snoozeDuration: '5 min',
              instructions: '',
              startDate: '2025-01-15',
              endDate: null,
              intervalDays: null,
            },
          });
        }),
      ).rejects.toThrow('Not authenticated');
    });

    it('useUpdateSchedule throws Not authenticated', async () => {
      const { result } = renderHook(() => useUpdateSchedule(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync({ id: 'sched-1', updates: { frequency: 'weekly' } }); }),
      ).rejects.toThrow('Not authenticated');
    });

    it('useDeleteSchedule throws Not authenticated', async () => {
      const { result } = renderHook(() => useDeleteSchedule(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync('sched-1'); }),
      ).rejects.toThrow('Not authenticated');
    });

    it('useLogDose throws Not authenticated', async () => {
      const { result } = renderHook(() => useLogDose(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            scheduleId: 'sched-1',
            medicationId: 'med-1',
            date: '2025-01-15',
            timeLabel: 'Morning',
            status: 'taken',
          });
        }),
      ).rejects.toThrow('Not authenticated');
    });

    it('useDeleteDoseLog throws Not authenticated', async () => {
      const { result } = renderHook(() => useDeleteDoseLog(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync('log-1'); }),
      ).rejects.toThrow('Not authenticated');
    });

    it('useLogSymptom throws Not authenticated', async () => {
      const { result } = renderHook(() => useLogSymptom(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            name: 'Headache',
            severity: 'moderate',
            medicationId: null,
            notes: null,
          });
        }),
      ).rejects.toThrow('Not authenticated');
    });

    it('useDeleteSymptom throws Not authenticated', async () => {
      const { result } = renderHook(() => useDeleteSymptom(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync('sym-1'); }),
      ).rejects.toThrow('Not authenticated');
    });

    it('useDeleteSymptomsByDate throws Not authenticated', async () => {
      const { result } = renderHook(() => useDeleteSymptomsByDate(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync('2025-01-15'); }),
      ).rejects.toThrow('Not authenticated');
    });
  });

  // ── Branch coverage: mutation hooks – supabase errors ────────────

  describe('mutation hooks - supabase errors', () => {
    it('useCreateMedication throws on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useCreateMedication(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync(); }),
      ).rejects.toThrow('mutation error');
    });

    it('useUpdateMedication throws on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useUpdateMedication(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync({ id: 'med-1', updates: { name: 'X' } }); }),
      ).rejects.toThrow('mutation error');
    });

    it('useDeleteMedication throws on supabase delete error', async () => {
      // First call: fetch schedules succeeds
      const scheduleChain = createChain({ data: [], error: null });
      // Second call: delete fails
      const deleteChain = createChain({ data: null, error: { message: 'mutation error' } });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return scheduleChain;
        return deleteChain;
      });

      const { result } = renderHook(() => useDeleteMedication(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync('med-1'); }),
      ).rejects.toThrow('mutation error');
    });

    it('useLogDose throws on supabase error (scheduled)', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useLogDose(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            scheduleId: 'sched-1',
            medicationId: 'med-1',
            date: '2025-01-15',
            timeLabel: 'Morning',
            status: 'taken',
          });
        }),
      ).rejects.toThrow('mutation error');
    });

    it('useLogDose throws on supabase error (PRN)', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useLogDose(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            scheduleId: null,
            medicationId: 'med-1',
            date: '2025-01-15',
            timeLabel: 'As Needed',
            status: 'taken',
          });
        }),
      ).rejects.toThrow('mutation error');
    });

    it('useLogSymptom throws on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useLogSymptom(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            name: 'Headache',
            severity: 'moderate',
            medicationId: null,
            notes: null,
          });
        }),
      ).rejects.toThrow('mutation error');
    });

    it('useDeleteSymptom throws on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDeleteSymptom(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync('sym-1'); }),
      ).rejects.toThrow('mutation error');
    });

    it('useDeleteSymptomsByDate throws on supabase error', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDeleteSymptomsByDate(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync('2025-01-15'); }),
      ).rejects.toThrow('mutation error');
    });

    it('useCreateSchedule throws on supabase insert error', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useCreateSchedule(), { wrapper: createWrapper() });

      await expect(
        act(async () => {
          await result.current.mutateAsync({
            medicationId: 'med-1',
            scheduleDraft: {
              frequency: 'Daily',
              selectedDays: ['Mon'],
              timesOfDay: ['Morning'],
              dosagePerDose: 1,
              pushNotifications: true,
              smsAlerts: false,
              snoozeDuration: '5 min',
              instructions: '',
              startDate: '2025-01-15',
              endDate: null,
              intervalDays: null,
            },
          });
        }),
      ).rejects.toThrow('mutation error');
    });

    it('useUpdateSchedule throws on supabase update error', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useUpdateSchedule(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync({ id: 'sched-1', updates: { frequency: 'weekly' } }); }),
      ).rejects.toThrow('mutation error');
    });

    it('useDeleteSchedule throws on supabase delete error', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDeleteSchedule(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync('sched-1'); }),
      ).rejects.toThrow('mutation error');
    });

    it('useDeleteDoseLog throws on supabase delete error', async () => {
      const chain = createChain({ data: null, error: { message: 'mutation error' } });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDeleteDoseLog(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync('log-1'); }),
      ).rejects.toThrow('mutation error');
    });

    it('useAdjustSupply throws on update error', async () => {
      const fetchChain = createChain({
        data: { current_supply: 10, low_supply_threshold: 5, name: 'Aspirin' },
        error: null,
      });
      const updateChain = createChain({ data: null, error: { message: 'mutation error' } });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchChain;
        return updateChain;
      });

      const { result } = renderHook(() => useAdjustSupply(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync({ medicationId: 'med-1', delta: -1 }); }),
      ).rejects.toThrow('mutation error');
    });
  });

  // ── Branch coverage: edge case branches ──────────────────────────

  describe('edge case branches', () => {
    it('useAdjustSupply with delta=0 returns early without supabase calls', async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useAdjustSupply(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ medicationId: 'med-1', delta: 0 });
      });

      // Should not call supabase at all when delta is 0
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('useAdjustSupply throws Medication not found when fetch returns null data and no error', async () => {
      const fetchChain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(fetchChain);

      const { result } = renderHook(() => useAdjustSupply(), { wrapper: createWrapper() });

      await expect(
        act(async () => { await result.current.mutateAsync({ medicationId: 'med-1', delta: -1 }); }),
      ).rejects.toThrow('Medication not found');
    });

    it('useCreateSchedule uses "your medication" fallback when med name fetch fails', async () => {
      const scheduleRow = {
        id: 'sched-new',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: ['Mon'],
        times_of_day: ['Morning'],
        push_notifications: true,
        snooze_duration: '5 min',
        dosage_per_dose: 1,
        interval_days: null,
        start_date: '2025-01-15',
      };
      const insertChain = createChain({ data: scheduleRow, error: null });
      // Med name fetch returns null data (error or missing)
      const medChain = createChain({ data: null, error: { message: 'not found' } });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return insertChain;
        return medChain;
      });

      const { result } = renderHook(() => useCreateSchedule(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          medicationId: 'med-1',
          scheduleDraft: {
            frequency: 'Daily',
            selectedDays: ['Mon'],
            timesOfDay: ['Morning'],
            dosagePerDose: 1,
            pushNotifications: true,
            smsAlerts: false,
            snoozeDuration: '5 min',
            instructions: '',
            startDate: '2025-01-15',
            endDate: null,
            intervalDays: null,
          },
        });
      });

      // Should call scheduleMedicationReminders with 'your medication' as fallback
      expect(scheduleMedicationReminders).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sched-new' }),
        'your medication',
      );
    });

    it('useUpdateSchedule uses "your medication" fallback when med name returns null', async () => {
      const updatedRow = {
        id: 'sched-1',
        medication_id: 'med-1',
        frequency: 'daily',
        selected_days: ['Mon'],
        times_of_day: ['Morning'],
        push_notifications: true,
        snooze_duration: '5 min',
        dosage_per_dose: 1,
        interval_days: null,
        start_date: '2025-01-15',
      };
      const updateChain = createChain({ data: updatedRow, error: null });
      // Med name fetch returns null data
      const medChain = createChain({ data: null, error: null });

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return updateChain;
        return medChain;
      });

      const { result } = renderHook(() => useUpdateSchedule(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'sched-1',
          updates: { frequency: 'weekly' },
        });
      });

      expect(scheduleMedicationReminders).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sched-1' }),
        'your medication',
      );
    });

    it('useLogSymptom derives logged_date from loggedAt when no explicit loggedDate', async () => {
      const chain = createChain({
        data: { id: 'sym-1', name: 'Nausea', severity: 'mild' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useLogSymptom(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Nausea',
          severity: 'mild',
          medicationId: null,
          notes: null,
          loggedAt: '2025-03-20T14:30:00Z',
        });
      });

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          logged_at: '2025-03-20T14:30:00Z',
          logged_date: '2025-03-20',
        }),
      );
    });

    it('useLogDose passes reason through when provided', async () => {
      const chain = createChain({
        data: { id: 'log-1', schedule_id: null, medication_id: 'med-1' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useLogDose(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          scheduleId: null,
          medicationId: 'med-1',
          date: '2025-01-15',
          timeLabel: 'As Needed',
          status: 'skipped',
          reason: 'Felt better',
        });
      });

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule_id: null,
          status: 'skipped',
          reason: 'Felt better',
        }),
      );
    });

    it('useLogSymptom uses toISO fallback when neither loggedAt nor loggedDate provided', async () => {
      const chain = createChain({
        data: { id: 'sym-1', name: 'Headache', severity: 'moderate' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useLogSymptom(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Headache',
          severity: 'moderate',
          medicationId: null,
          notes: null,
        });
      });

      // toISO is mocked to return '2025-01-15'
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          logged_at: null,
          logged_date: '2025-01-15',
        }),
      );
    });

    it('useLogSymptom uses explicit loggedDate when both loggedAt and loggedDate are provided', async () => {
      const chain = createChain({
        data: { id: 'sym-1', name: 'Dizziness', severity: 'severe' },
        error: null,
      });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useLogSymptom(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({
          name: 'Dizziness',
          severity: 'severe',
          medicationId: 'med-1',
          notes: 'Very dizzy',
          loggedAt: '2025-03-20T14:30:00Z',
          loggedDate: '2025-03-19',
        });
      });

      // Explicit loggedDate should take precedence
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          logged_at: '2025-03-20T14:30:00Z',
          logged_date: '2025-03-19',
        }),
      );
    });
  });

  // ── Branch coverage: query hooks with undefined params ───────────

  describe('query hooks with undefined params', () => {
    it('useMedication is disabled when id is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useMedication(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('useSchedulesByMedication is disabled when medicationId is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSchedulesByMedication(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('useSchedule is disabled when id is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSchedule(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('useDoseLogsByDate is disabled when date is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDoseLogsByDate(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('useDoseLogsByRange is disabled when startDate is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDoseLogsByRange(undefined, '2025-01-31'), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('useDoseLogsByRange is disabled when endDate is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useDoseLogsByRange('2025-01-01', undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('usePrnLogs is disabled when medicationId is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => usePrnLogs(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('useSymptomsByDate is disabled when date is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByDate(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('useSymptomsByRange is disabled when startDate is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByRange(undefined, '2025-01-31'), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('useSymptomsByRange is disabled when endDate is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByRange('2025-01-01', undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('useSymptomsByMedication is disabled when medicationId is undefined', () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const { result } = renderHook(() => useSymptomsByMedication(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });
});
