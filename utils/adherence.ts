import { DAY_LABELS } from '../constants/days';
import type { DoseLogRow, MedicationRow, ScheduleRow } from '../types/database';
import { toISO } from './date';
import { isIntervalDayMatch, resolveTimeSlot } from './dose';

/**
 * Compute overall adherence percentage for the given date range.
 * Adherence = taken / total-expected.  Skipped doses count as missed.
 */
export function computeAdherence(
  startISO: string,
  endISO: string,
  medications: MedicationRow[],
  schedules: ScheduleRow[],
  doseLogs: DoseLogRow[],
): number {
  const logMap = new Map(
    doseLogs.map((l) => [`${l.scheduled_date}|${l.schedule_id}|${l.time_label}`, l.status]),
  );
  // Exclude PRN medications from adherence calculations
  const scheduledMeds = medications.filter((m) => !m.is_prn);
  const medIds = new Set(scheduledMeds.map((m) => m.id));

  const todayISO = toISO(new Date());
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let total = 0;
  let taken = 0;

  const current = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);

  while (current <= end) {
    const iso = toISO(current);
    const dayLabel = DAY_LABELS[current.getDay()];

    for (const sch of schedules) {
      if (!medIds.has(sch.medication_id)) continue;

      if (sch.frequency === 'interval' && sch.interval_days) {
        if (!isIntervalDayMatch(sch.start_date, iso, sch.interval_days)) continue;
      } else if (sch.frequency !== 'daily') {
        if (!sch.selected_days.includes(dayLabel)) continue;
      }

      if (sch.start_date && iso < sch.start_date) continue;
      if (sch.end_date && iso > sch.end_date) continue;

      for (const label of sch.times_of_day) {
        // Skip today's doses whose scheduled time hasn't passed yet
        if (iso === todayISO) {
          const { sortOrder } = resolveTimeSlot(label);
          if (sortOrder > nowMinutes) continue;
        }

        total++;
        if (logMap.get(`${iso}|${sch.id}|${label}`) === 'taken') taken++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return total === 0 ? 0 : Math.round((taken / total) * 100);
}

/**
 * Compute the current streak of consecutive days (going backwards from
 * yesterday) where every scheduled dose was taken.  Today is excluded
 * because it may still be in progress.
 */
export function computeStreak(
  todayISO: string,
  medications: MedicationRow[],
  schedules: ScheduleRow[],
  doseLogs: DoseLogRow[],
): number {
  const logMap = new Map(
    doseLogs.map((l) => [`${l.scheduled_date}|${l.schedule_id}|${l.time_label}`, l.status]),
  );
  // Exclude PRN medications from streak calculations
  const scheduledMeds = medications.filter((m) => !m.is_prn);
  const medIds = new Set(scheduledMeds.map((m) => m.id));

  let streak = 0;
  const d = new Date(`${todayISO}T00:00:00`);
  d.setDate(d.getDate() - 1);

  for (let i = 0; i < 365; i++) {
    const iso = toISO(d);
    const dayLabel = DAY_LABELS[d.getDay()];

    let dayTotal = 0;
    let dayTaken = 0;

    for (const sch of schedules) {
      if (!medIds.has(sch.medication_id)) continue;

      if (sch.frequency === 'interval' && sch.interval_days) {
        if (!isIntervalDayMatch(sch.start_date, iso, sch.interval_days)) continue;
      } else if (sch.frequency !== 'daily') {
        if (!sch.selected_days.includes(dayLabel)) continue;
      }

      if (sch.start_date && iso < sch.start_date) continue;
      if (sch.end_date && iso > sch.end_date) continue;

      for (const label of sch.times_of_day) {
        dayTotal++;
        if (logMap.get(`${iso}|${sch.id}|${label}`) === 'taken') dayTaken++;
      }
    }

    if (dayTotal === 0) {
      d.setDate(d.getDate() - 1);
      continue;
    }

    if (dayTaken === dayTotal) {
      streak++;
    } else {
      break;
    }

    d.setDate(d.getDate() - 1);
  }

  return streak;
}
