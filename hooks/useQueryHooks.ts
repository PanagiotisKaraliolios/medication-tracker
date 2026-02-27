import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import {
  scheduleMedicationReminders,
  cancelMedicationReminders,
  scheduleLowSupplyReminder,
  cancelLowSupplyReminder,
} from '../lib/notifications';
import type {
  MedicationRow,
  MedicationUpdate,
  ScheduleRow,
  ScheduleUpdate,
  ScheduleDraft,
  DoseLogRow,
} from '../types/database';
import { useMedicationDraft } from '../stores/draftStores';

// ─────────────────────────────────────────────────────────────────────
//  MEDICATION QUERIES
// ─────────────────────────────────────────────────────────────────────

/** Fetch all active medications for the current user. */
export function useMedications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.medications.all,
    queryFn: async (): Promise<MedicationRow[]> => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as MedicationRow[];
    },
    enabled: !!user?.id,
  });
}

/** Fetch a single medication by ID. */
export function useMedication(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.medications.detail(id ?? ''),
    queryFn: async (): Promise<MedicationRow> => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('id', id!)
        .eq('user_id', user!.id)
        .single();

      if (error) throw new Error(error.message);
      return data as MedicationRow;
    },
    enabled: !!user?.id && !!id,
  });
}

// ─────────────────────────────────────────────────────────────────────
//  MEDICATION MUTATIONS
// ─────────────────────────────────────────────────────────────────────

/** Create a medication from the current Zustand draft. */
export function useCreateMedication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const draft = useMedicationDraft((s) => s.draft);

  return useMutation({
    mutationFn: async (): Promise<MedicationRow> => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('medications')
        .insert({
          user_id: user.id,
          name: draft.name,
          dosage: draft.dosage,
          form: draft.form,
          icon: draft.icon,
          current_supply: draft.currentSupply,
          low_supply_threshold: draft.lowSupplyThreshold,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as MedicationRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.all });
    },
  });
}

/** Update an existing medication. */
export function useUpdateMedication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: MedicationUpdate }): Promise<MedicationRow> => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('medications')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as MedicationRow;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.detail(id) });
    },
  });
}

/** Soft-delete a medication (also cancels its schedule notifications). */
export function useDeleteMedication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('Not authenticated');

      // Cancel notifications for all schedules of this medication
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('medication_id', id)
        .eq('user_id', user.id);
      if (schedules) {
        await Promise.all(
          schedules.map((s: { id: string }) => cancelMedicationReminders(s.id).catch(() => {})),
        );
      }

      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
    },
  });
}

/** Atomically adjust a medication's current_supply by `delta`. Clamps at 0. */
export function useAdjustSupply() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ medicationId, delta }: { medicationId: string; delta: number }): Promise<void> => {
      if (!user?.id) throw new Error('Not authenticated');
      if (delta === 0) return;

      const { data: med, error: fetchErr } = await supabase
        .from('medications')
        .select('current_supply, low_supply_threshold, name')
        .eq('id', medicationId)
        .eq('user_id', user.id)
        .single();

      if (fetchErr || !med) throw new Error(fetchErr?.message ?? 'Medication not found');

      const newSupply = Math.max(0, med.current_supply + delta);

      const { error: updateErr } = await supabase
        .from('medications')
        .update({ current_supply: newSupply })
        .eq('id', medicationId)
        .eq('user_id', user.id);

      if (updateErr) throw new Error(updateErr.message);

      // Schedule or cancel low-supply reminder
      if (newSupply <= med.low_supply_threshold) {
        scheduleLowSupplyReminder(medicationId, med.name, newSupply).catch((err) =>
          console.warn('[useAdjustSupply] Failed to schedule low-supply reminder:', err),
        );
      } else {
        cancelLowSupplyReminder(medicationId).catch((err) =>
          console.warn('[useAdjustSupply] Failed to cancel low-supply reminder:', err),
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.medications.all });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
//  SCHEDULE QUERIES
// ─────────────────────────────────────────────────────────────────────

/** Fetch all active schedules for the current user. */
export function useSchedules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.schedules.all,
    queryFn: async (): Promise<ScheduleRow[]> => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as ScheduleRow[];
    },
    enabled: !!user?.id,
  });
}

/** Fetch schedules for a specific medication. */
export function useSchedulesByMedication(medicationId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.schedules.byMedication(medicationId ?? ''),
    queryFn: async (): Promise<ScheduleRow[]> => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('medication_id', medicationId!)
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as ScheduleRow[];
    },
    enabled: !!user?.id && !!medicationId,
  });
}

/** Fetch a single schedule by ID. */
export function useSchedule(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.schedules.detail(id ?? ''),
    queryFn: async (): Promise<ScheduleRow> => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', id!)
        .eq('user_id', user!.id)
        .single();

      if (error) throw new Error(error.message);
      return data as ScheduleRow;
    },
    enabled: !!user?.id && !!id,
  });
}

// ─────────────────────────────────────────────────────────────────────
//  SCHEDULE MUTATIONS
// ─────────────────────────────────────────────────────────────────────

/** Create a new schedule from the Zustand schedule-draft. */
export function useCreateSchedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      medicationId,
      scheduleDraft,
      overrides,
    }: {
      medicationId: string;
      scheduleDraft: ScheduleDraft;
      overrides?: Partial<ScheduleDraft>;
    }): Promise<ScheduleRow> => {
      if (!user?.id) throw new Error('Not authenticated');

      const merged = { ...scheduleDraft, ...overrides };

      const { data, error } = await supabase
        .from('schedules')
        .insert({
          medication_id: medicationId,
          user_id: user.id,
          frequency: merged.frequency.toLowerCase(),
          selected_days: merged.selectedDays,
          times_of_day: merged.timesOfDay,
          dosage_per_dose: merged.dosagePerDose,
          push_notifications: merged.pushNotifications,
          sms_alerts: merged.smsAlerts,
          snooze_duration: merged.snoozeDuration,
          instructions: merged.instructions,
          start_date: merged.startDate,
          end_date: merged.endDate,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Schedule OS notifications
      const row = data as ScheduleRow;
      const { data: med } = await supabase
        .from('medications')
        .select('name')
        .eq('id', medicationId)
        .single();
      const medName = med?.name ?? 'your medication';
      scheduleMedicationReminders(
        {
          id: row.id,
          medication_id: row.medication_id,
          frequency: row.frequency,
          selected_days: row.selected_days,
          times_of_day: row.times_of_day,
          push_notifications: row.push_notifications,
          snooze_duration: row.snooze_duration,
          dosage_per_dose: row.dosage_per_dose,
        },
        medName,
      ).catch((err) => console.warn('[useCreateSchedule] Failed to schedule reminders:', err));

      return row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
    },
  });
}

/** Update an existing schedule. */
export function useUpdateSchedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ScheduleUpdate }): Promise<ScheduleRow> => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('schedules')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Reschedule OS notifications
      const row = data as ScheduleRow;
      const { data: med } = await supabase
        .from('medications')
        .select('name')
        .eq('id', row.medication_id)
        .single();
      const medName = med?.name ?? 'your medication';
      scheduleMedicationReminders(
        {
          id: row.id,
          medication_id: row.medication_id,
          frequency: row.frequency,
          selected_days: row.selected_days,
          times_of_day: row.times_of_day,
          push_notifications: row.push_notifications,
          snooze_duration: row.snooze_duration,
          dosage_per_dose: row.dosage_per_dose,
        },
        medName,
      ).catch((err) => console.warn('[useUpdateSchedule] Failed to reschedule reminders:', err));

      return row;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.detail(id) });
    },
  });
}

/** Delete a schedule and cancel its notifications. */
export function useDeleteSchedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('Not authenticated');

      cancelMedicationReminders(id).catch(() => {});

      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
//  DOSE-LOG QUERIES
// ─────────────────────────────────────────────────────────────────────

/** Fetch dose logs for a specific date. */
export function useDoseLogsByDate(date: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.doseLogs.byDate(date ?? ''),
    queryFn: async (): Promise<DoseLogRow[]> => {
      const { data, error } = await supabase
        .from('dose_logs')
        .select('*')
        .eq('user_id', user!.id)
        .eq('scheduled_date', date!);

      if (error) throw new Error(error.message);
      return (data ?? []) as DoseLogRow[];
    },
    enabled: !!user?.id && !!date,
  });
}

/** Fetch dose logs for a date range. */
export function useDoseLogsByRange(startDate: string | undefined, endDate: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.doseLogs.byRange(startDate ?? '', endDate ?? ''),
    queryFn: async (): Promise<DoseLogRow[]> => {
      const { data, error } = await supabase
        .from('dose_logs')
        .select('*')
        .eq('user_id', user!.id)
        .gte('scheduled_date', startDate!)
        .lte('scheduled_date', endDate!);

      if (error) throw new Error(error.message);
      return (data ?? []) as DoseLogRow[];
    },
    enabled: !!user?.id && !!startDate && !!endDate,
  });
}

// ─────────────────────────────────────────────────────────────────────
//  DOSE-LOG MUTATIONS
// ─────────────────────────────────────────────────────────────────────

/** Log or update a dose (upsert on schedule+date+time). */
export function useLogDose() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scheduleId,
      medicationId,
      date,
      timeLabel,
      status,
    }: {
      scheduleId: string;
      medicationId: string;
      date: string;
      timeLabel: string;
      status: 'taken' | 'skipped';
    }): Promise<DoseLogRow> => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('dose_logs')
        .upsert(
          {
            schedule_id: scheduleId,
            medication_id: medicationId,
            user_id: user.id,
            scheduled_date: date,
            time_label: timeLabel,
            status,
            logged_at: new Date().toISOString(),
          },
          { onConflict: 'schedule_id,scheduled_date,time_label' },
        )
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as DoseLogRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doseLogs.all });
    },
  });
}

/** Delete a dose log (for undo). */
export function useDeleteDoseLog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('dose_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doseLogs.all });
    },
  });
}
