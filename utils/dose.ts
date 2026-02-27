import { TIME_SLOT_MAP } from '../constants/schedule';
import { parseTimeToMinutes } from './date';
import type { MedicationRow, ScheduleRow, DoseLogRow } from '../contexts/MedicationContext';

/** Represents a single dose to take/track on the Today screen. */
export type TodayDose = {
  key: string;
  medicationId: string;
  scheduleId: string;
  name: string;
  dosage: string;
  form: string;
  icon: string;
  timeLabel: string;
  time: string;
  sortOrder: number;
  dosagePerDose: number;
  instructions: string;
  snoozeDuration: string;
  status: 'pending' | 'taken' | 'skipped';
  doseLogId: string | null;
};

/** Resolve a time label (preset or custom "h:mm AM/PM") to display time + sort order. */
export function resolveTimeSlot(label: string): { time: string; sortOrder: number } {
  const preset = TIME_SLOT_MAP[label];
  if (preset) return preset;
  const mins = parseTimeToMinutes(label);
  return { time: label, sortOrder: mins >= 0 ? mins : 9999 };
}

/**
 * Build the list of doses for a given day from medications, schedules, and logs.
 * Includes orphaned dose logs whose time_label is no longer in the current schedule.
 */
export function buildTodayDoses(
  medications: MedicationRow[],
  schedules: ScheduleRow[],
  doseLogs: DoseLogRow[],
  todayLabel: string,
  dateISO?: string,
): TodayDose[] {
  const medMap = new Map(medications.map((m) => [m.id, m]));
  const logMap = new Map(
    doseLogs.map((l) => [`${l.schedule_id}-${l.time_label}`, l]),
  );
  const doses: TodayDose[] = [];
  const usedLogKeys = new Set<string>();

  for (const sch of schedules) {
    const med = medMap.get(sch.medication_id);
    if (!med) continue;
    if (!sch.selected_days.includes(todayLabel)) continue;

    if (dateISO) {
      if (sch.start_date && dateISO < sch.start_date) continue;
      if (sch.end_date && dateISO > sch.end_date) continue;
    }

    for (const label of sch.times_of_day) {
      const slot = resolveTimeSlot(label);
      const logKey = `${sch.id}-${label}`;
      const log = logMap.get(logKey);
      usedLogKeys.add(logKey);

      doses.push({
        key: logKey,
        medicationId: med.id,
        scheduleId: sch.id,
        name: med.name,
        dosage: med.dosage,
        form: med.form,
        icon: med.icon,
        timeLabel: label,
        time: slot.time,
        sortOrder: slot.sortOrder,
        dosagePerDose: sch.dosage_per_dose,
        instructions: sch.instructions,
        snoozeDuration: sch.snooze_duration,
        status: log ? log.status : 'pending',
        doseLogId: log?.id ?? null,
      });
    }

    // Include orphaned dose logs
    for (const log of doseLogs) {
      if (log.schedule_id !== sch.id) continue;
      const orphanKey = `${log.schedule_id}-${log.time_label}`;
      if (usedLogKeys.has(orphanKey)) continue;
      usedLogKeys.add(orphanKey);

      const slot = resolveTimeSlot(log.time_label);
      doses.push({
        key: orphanKey,
        medicationId: med.id,
        scheduleId: sch.id,
        name: med.name,
        dosage: med.dosage,
        form: med.form,
        icon: med.icon,
        timeLabel: log.time_label,
        time: slot.time,
        sortOrder: slot.sortOrder,
        dosagePerDose: sch.dosage_per_dose,
        instructions: sch.instructions,
        snoozeDuration: sch.snooze_duration,
        status: log.status,
        doseLogId: log.id,
      });
    }
  }

  return doses.sort((a, b) => a.sortOrder - b.sortOrder);
}
