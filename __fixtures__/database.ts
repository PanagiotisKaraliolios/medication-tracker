import type { DoseLogRow, MedicationRow, ScheduleRow, SymptomRow } from '../types/database';

let idCounter = 0;
function nextId(): string {
  return `test-${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export function makeMedication(overrides: Partial<MedicationRow> = {}): MedicationRow {
  return {
    id: nextId(),
    user_id: 'user-1',
    name: 'Aspirin',
    dosage: '100mg',
    form: 'tablet',
    icon: 'tablet',
    current_supply: 30,
    low_supply_threshold: 10,
    is_prn: false,
    rxcui: null,
    generic_name: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeSchedule(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: nextId(),
    medication_id: 'med-1',
    user_id: 'user-1',
    frequency: 'daily',
    selected_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    times_of_day: ['Morning'],
    dosage_per_dose: 1,
    push_notifications: true,
    sms_alerts: false,
    snooze_duration: '5 min',
    instructions: '',
    start_date: '2025-01-01',
    end_date: null,
    interval_days: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeDoseLog(overrides: Partial<DoseLogRow> = {}): DoseLogRow {
  return {
    id: nextId(),
    schedule_id: 'sch-1',
    medication_id: 'med-1',
    user_id: 'user-1',
    scheduled_date: '2025-01-15',
    time_label: 'Morning',
    status: 'taken',
    reason: null,
    logged_at: '2025-01-15T08:00:00Z',
    created_at: '2025-01-15T08:00:00Z',
    ...overrides,
  };
}

export function makeSymptom(overrides: Partial<SymptomRow> = {}): SymptomRow {
  return {
    id: nextId(),
    user_id: 'user-1',
    medication_id: null,
    name: 'Headache',
    severity: 'mild',
    notes: null,
    logged_at: '2025-01-15T10:00:00Z',
    logged_date: '2025-01-15',
    created_at: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}
