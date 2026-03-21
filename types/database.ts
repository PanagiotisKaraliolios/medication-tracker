// ─── Medication types ────────────────────────────────────────────────

/** Draft for creating a new medication (camelCase for forms) */
export type MedicationDraft = {
  name: string;
  dosage: string;
  form: string;
  icon: string;
  currentSupply: number;
  lowSupplyThreshold: number;
  isPrn: boolean;
  rxcui: string | null;
  genericName: string | null;
};

export const emptyMedicationDraft: MedicationDraft = {
  name: '',
  dosage: '',
  form: 'tablet',
  icon: 'tablet',
  currentSupply: 30,
  lowSupplyThreshold: 10,
  isPrn: false,
  rxcui: null,
  genericName: null,
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
  is_prn: boolean;
  rxcui: string | null;
  generic_name: string | null;
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
  is_prn?: boolean;
  rxcui?: string | null;
  generic_name?: string | null;
};

// ─── Schedule types ──────────────────────────────────────────────────

/** Draft for creating / editing a schedule (camelCase for forms) */
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
  intervalDays: number | null; // only used when frequency = 'Interval'
};

export const emptyScheduleDraft: ScheduleDraft = {
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
  intervalDays: null,
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
  interval_days: number | null;
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
  interval_days?: number | null;
};

// ─── Dose-log types ──────────────────────────────────────────────────

/** Row shape returned from Supabase dose_logs table */
export type DoseLogRow = {
  id: string;
  schedule_id: string | null;
  medication_id: string;
  user_id: string;
  scheduled_date: string;
  time_label: string;
  status: 'taken' | 'skipped';
  reason: string | null;
  logged_at: string;
  created_at: string;
};

// ─── Symptom types ───────────────────────────────────────────────────

/** Row shape returned from Supabase symptoms table */
export type SymptomRow = {
  id: string;
  user_id: string;
  medication_id: string | null;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes: string | null;
  logged_at: string | null;
  logged_date: string;
  created_at: string;
};

/** Draft for logging a new symptom (camelCase for forms) */
export type SymptomDraft = {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  medicationId: string | null;
  notes: string;
};

export const emptySymptomDraft: SymptomDraft = {
  name: '',
  severity: 'moderate',
  medicationId: null,
  notes: '',
};
