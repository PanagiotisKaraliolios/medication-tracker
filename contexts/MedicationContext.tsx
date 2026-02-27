import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  scheduleMedicationReminders,
  cancelMedicationReminders,
  scheduleLowSupplyReminder,
  cancelLowSupplyReminder,
  type ScheduleNotifInput,
} from '../lib/notifications';

// ─── Medication types ────────────────────────────────────────────────

/** Draft for creating a new medication */
export type MedicationDraft = {
  name: string;
  dosage: string;
  form: string;
  icon: string;
  currentSupply: number;
  lowSupplyThreshold: number;
};

const emptyMedicationDraft: MedicationDraft = {
  name: '',
  dosage: '',
  form: 'tablet',
  icon: 'pill',
  currentSupply: 30,
  lowSupplyThreshold: 10,
};

/** Row shape returned from Supabase medications table */
export type MedicationRow = {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  form: string;
  icon: string;
  current_supply: number;
  low_supply_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Fields that can be updated on an existing medication */
export type MedicationUpdate = {
  name?: string;
  dosage?: string;
  form?: string;
  icon?: string;
  current_supply?: number;
  low_supply_threshold?: number;
};

// ─── Schedule types ──────────────────────────────────────────────────

/** Draft for creating / editing a schedule */
export type ScheduleDraft = {
  frequency: string;
  selectedDays: string[];
  timesOfDay: string[];
  dosagePerDose: number;
  pushNotifications: boolean;
  smsAlerts: boolean;
  snoozeDuration: string;
  instructions: string;
  startDate: string;        // ISO date string (YYYY-MM-DD)
  endDate: string | null;   // null = continue forever
};

const emptyScheduleDraft: ScheduleDraft = {
  frequency: 'Daily',
  selectedDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  timesOfDay: ['Morning'],
  dosagePerDose: 1,
  pushNotifications: true,
  smsAlerts: false,
  snoozeDuration: '5 min',
  instructions: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: null,
};

/** Row shape returned from Supabase schedules table */
export type ScheduleRow = {
  id: string;
  medication_id: string;
  user_id: string;
  frequency: string;
  selected_days: string[];
  times_of_day: string[];
  dosage_per_dose: number;
  push_notifications: boolean;
  sms_alerts: boolean;
  snooze_duration: string;
  instructions: string;
  start_date: string;       // ISO date (YYYY-MM-DD)
  end_date: string | null;  // null = forever
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Fields that can be updated on an existing schedule */
export type ScheduleUpdate = {
  frequency?: string;
  selected_days?: string[];
  times_of_day?: string[];
  dosage_per_dose?: number;
  push_notifications?: boolean;
  sms_alerts?: boolean;
  snooze_duration?: string;
  instructions?: string;
  start_date?: string;
  end_date?: string | null;
};

// ─── Dose-log types ──────────────────────────────────────────────────

/** Row shape returned from Supabase dose_logs table */
export type DoseLogRow = {
  id: string;
  schedule_id: string;
  medication_id: string;
  user_id: string;
  scheduled_date: string;
  time_label: string;
  status: 'taken' | 'skipped';
  logged_at: string;
  created_at: string;
};

// ─── Context ─────────────────────────────────────────────────────────

type MedicationContextType = {
  // Medication draft
  draft: MedicationDraft;
  updateDraft: (partial: Partial<MedicationDraft>) => void;
  resetDraft: () => void;

  // Schedule draft
  scheduleDraft: ScheduleDraft;
  updateScheduleDraft: (partial: Partial<ScheduleDraft>) => void;
  resetScheduleDraft: () => void;

  /** ID of an existing medication being scheduled */
  schedulingMedId: string | null;
  setSchedulingMedId: (id: string | null) => void;

  // Medication CRUD
  saveMedication: () => Promise<{ data: MedicationRow | null; error: string | null }>;
  fetchMedications: () => Promise<{ data: MedicationRow[]; error: string | null }>;
  fetchMedication: (id: string) => Promise<{ data: MedicationRow | null; error: string | null }>;
  updateMedication: (id: string, updates: MedicationUpdate) => Promise<{ data: MedicationRow | null; error: string | null }>;
  deleteMedication: (id: string) => Promise<{ error: string | null }>;

  // Schedule CRUD
  saveSchedule: (medicationId: string, overrides?: Partial<ScheduleDraft>) => Promise<{ data: ScheduleRow | null; error: string | null }>;
  fetchSchedules: (medicationId: string) => Promise<{ data: ScheduleRow[]; error: string | null }>;
  fetchAllSchedules: () => Promise<{ data: ScheduleRow[]; error: string | null }>;
  fetchSchedule: (id: string) => Promise<{ data: ScheduleRow | null; error: string | null }>;
  updateSchedule: (id: string, updates: ScheduleUpdate) => Promise<{ data: ScheduleRow | null; error: string | null }>;
  deleteSchedule: (id: string) => Promise<{ error: string | null }>;

  // Dose-log CRUD
  logDose: (scheduleId: string, medicationId: string, date: string, timeLabel: string, status: 'taken' | 'skipped') => Promise<{ data: DoseLogRow | null; error: string | null }>;
  fetchDoseLogsForDate: (date: string) => Promise<{ data: DoseLogRow[]; error: string | null }>;
  fetchDoseLogsForRange: (startDate: string, endDate: string) => Promise<{ data: DoseLogRow[]; error: string | null }>;
  deleteDoseLog: (id: string) => Promise<{ error: string | null }>;

  // Inventory
  adjustSupply: (medicationId: string, delta: number) => Promise<{ error: string | null }>;
};

const MedicationContext = createContext<MedicationContextType>({
  draft: emptyMedicationDraft,
  updateDraft: () => {},
  resetDraft: () => {},
  scheduleDraft: emptyScheduleDraft,
  updateScheduleDraft: () => {},
  resetScheduleDraft: () => {},
  schedulingMedId: null,
  setSchedulingMedId: () => {},
  saveMedication: async () => ({ data: null, error: null }),
  fetchMedications: async () => ({ data: [], error: null }),
  fetchMedication: async () => ({ data: null, error: null }),
  updateMedication: async () => ({ data: null, error: null }),
  deleteMedication: async () => ({ error: null }),
  saveSchedule: async () => ({ data: null, error: null }),
  fetchSchedules: async () => ({ data: [], error: null }),
  fetchAllSchedules: async () => ({ data: [], error: null }),
  fetchSchedule: async () => ({ data: null, error: null }),
  updateSchedule: async () => ({ data: null, error: null }),
  deleteSchedule: async () => ({ error: null }),
  logDose: async () => ({ data: null, error: null }),
  fetchDoseLogsForDate: async () => ({ data: [], error: null }),
  fetchDoseLogsForRange: async () => ({ data: [], error: null }),
  deleteDoseLog: async () => ({ error: null }),
  adjustSupply: async () => ({ error: null }),
});

export function MedicationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<MedicationDraft>({ ...emptyMedicationDraft });
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({ ...emptyScheduleDraft });
  const [schedulingMedId, setSchedulingMedId] = useState<string | null>(null);

  // ── Medication draft helpers ──
  const updateDraft = useCallback((partial: Partial<MedicationDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft({ ...emptyMedicationDraft });
  }, []);

  // ── Schedule draft helpers ──
  const updateScheduleDraft = useCallback((partial: Partial<ScheduleDraft>) => {
    setScheduleDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetScheduleDraft = useCallback(() => {
    setScheduleDraft({ ...emptyScheduleDraft });
    setSchedulingMedId(null);
  }, []);

  // ── Medication CRUD ──

  const saveMedication = useCallback(async (): Promise<{ data: MedicationRow | null; error: string | null }> => {
    if (!user?.id) return { data: null, error: 'Not authenticated' };

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

    if (error) return { data: null, error: error.message };
    return { data: data as MedicationRow, error: null };
  }, [user, draft]);

  const fetchMedications = useCallback(async (): Promise<{ data: MedicationRow[]; error: string | null }> => {
    if (!user?.id) return { data: [], error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as MedicationRow[], error: null };
  }, [user]);

  const fetchMedication = useCallback(async (id: string): Promise<{ data: MedicationRow | null; error: string | null }> => {
    if (!user?.id) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as MedicationRow, error: null };
  }, [user]);

  const updateMedication = useCallback(async (id: string, updates: MedicationUpdate): Promise<{ data: MedicationRow | null; error: string | null }> => {
    if (!user?.id) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('medications')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as MedicationRow, error: null };
  }, [user]);

  const deleteMedication = useCallback(async (id: string): Promise<{ error: string | null }> => {
    if (!user?.id) return { error: 'Not authenticated' };

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

    if (error) return { error: error.message };
    return { error: null };
  }, [user]);

  // ── Schedule CRUD ──

  const saveSchedule = useCallback(async (medicationId: string, overrides?: Partial<ScheduleDraft>): Promise<{ data: ScheduleRow | null; error: string | null }> => {
    if (!user?.id) return { data: null, error: 'Not authenticated' };

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

    if (error) return { data: null, error: error.message };

    // Schedule OS notifications for the new schedule
    const row = data as ScheduleRow;
    // We need the medication name for the notification body
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
    ).catch((err) => console.warn('[MedCtx] Failed to schedule reminders:', err));

    return { data: row, error: null };
  }, [user, scheduleDraft]);

  const fetchSchedules = useCallback(async (medicationId: string): Promise<{ data: ScheduleRow[]; error: string | null }> => {
    if (!user?.id) return { data: [], error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('medication_id', medicationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as ScheduleRow[], error: null };
  }, [user]);

  const fetchSchedule = useCallback(async (id: string): Promise<{ data: ScheduleRow | null; error: string | null }> => {
    if (!user?.id) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as ScheduleRow, error: null };
  }, [user]);

  const updateSchedule = useCallback(async (id: string, updates: ScheduleUpdate): Promise<{ data: ScheduleRow | null; error: string | null }> => {
    if (!user?.id) return { data: null, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('schedules')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // Reschedule OS notifications with updated schedule data
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
    ).catch((err) => console.warn('[MedCtx] Failed to reschedule reminders:', err));

    return { data: row, error: null };
  }, [user]);

  const fetchAllSchedules = useCallback(async (): Promise<{ data: ScheduleRow[]; error: string | null }> => {
    if (!user?.id) return { data: [], error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as ScheduleRow[], error: null };
  }, [user]);

  const deleteSchedule = useCallback(async (id: string): Promise<{ error: string | null }> => {
    if (!user?.id) return { error: 'Not authenticated' };

    // Cancel notifications before deleting the schedule
    cancelMedicationReminders(id).catch(() => {});

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { error: null };
  }, [user]);

  // ── Dose-log CRUD ──

  const logDose = useCallback(async (
    scheduleId: string,
    medicationId: string,
    date: string,
    timeLabel: string,
    status: 'taken' | 'skipped',
  ): Promise<{ data: DoseLogRow | null; error: string | null }> => {
    if (!user?.id) return { data: null, error: 'Not authenticated' };

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

    if (error) return { data: null, error: error.message };
    return { data: data as DoseLogRow, error: null };
  }, [user]);

  const fetchDoseLogsForDate = useCallback(async (date: string): Promise<{ data: DoseLogRow[]; error: string | null }> => {
    if (!user?.id) return { data: [], error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('scheduled_date', date);

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as DoseLogRow[], error: null };
  }, [user]);

  const fetchDoseLogsForRange = useCallback(async (startDate: string, endDate: string): Promise<{ data: DoseLogRow[]; error: string | null }> => {
    if (!user?.id) return { data: [], error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('dose_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate);

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []) as DoseLogRow[], error: null };
  }, [user]);

  const deleteDoseLog = useCallback(async (id: string): Promise<{ error: string | null }> => {
    if (!user?.id) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('dose_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return { error: error.message };
    return { error: null };
  }, [user]);

  /** Atomically adjust a medication's current_supply by `delta` (negative to deduct, positive to restore). Clamps at 0. */
  const adjustSupply = useCallback(async (medicationId: string, delta: number): Promise<{ error: string | null }> => {
    if (!user?.id) return { error: 'Not authenticated' };
    if (delta === 0) return { error: null };

    // Fetch current supply + threshold + name for low-supply check
    const { data: med, error: fetchErr } = await supabase
      .from('medications')
      .select('current_supply, low_supply_threshold, name')
      .eq('id', medicationId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !med) return { error: fetchErr?.message ?? 'Medication not found' };

    const newSupply = Math.max(0, med.current_supply + delta);

    const { error: updateErr } = await supabase
      .from('medications')
      .update({ current_supply: newSupply })
      .eq('id', medicationId)
      .eq('user_id', user.id);

    if (updateErr) return { error: updateErr.message };

    // Schedule or cancel low-supply reminder based on new supply level
    if (newSupply <= med.low_supply_threshold) {
      scheduleLowSupplyReminder(medicationId, med.name, newSupply).catch((err) =>
        console.warn('[MedCtx] Failed to schedule low-supply reminder:', err),
      );
    } else {
      cancelLowSupplyReminder(medicationId).catch((err) =>
        console.warn('[MedCtx] Failed to cancel low-supply reminder:', err),
      );
    }

    return { error: null };
  }, [user]);

  return (
    <MedicationContext.Provider
      value={{
        draft, updateDraft, resetDraft,
        scheduleDraft, updateScheduleDraft, resetScheduleDraft,
        schedulingMedId, setSchedulingMedId,
        saveMedication, fetchMedications, fetchMedication, updateMedication, deleteMedication,
        saveSchedule, fetchSchedules, fetchAllSchedules, fetchSchedule, updateSchedule, deleteSchedule,
        logDose, fetchDoseLogsForDate, fetchDoseLogsForRange, deleteDoseLog,
        adjustSupply,
      }}
    >
      {children}
    </MedicationContext.Provider>
  );
}

export function useMedication() {
  return useContext(MedicationContext);
}
