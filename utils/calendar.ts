import { DAY_LABELS } from '../constants/days';
import type { DoseLogRow, MedicationRow, ScheduleRow } from '../types/database';
import { toISO } from './date';
import { isIntervalDayMatch } from './dose';

/** Status of doses on a given calendar day. */
export type DayStatus = 'all' | 'partial' | 'none' | 'empty';

/**
 * Compute a map of ISO date → DayStatus for a range of dates.
 * - 'empty'   = no doses scheduled that day
 * - 'none'    = doses scheduled but none taken/skipped
 * - 'partial' = some taken/skipped
 * - 'all'     = all taken/skipped (and at least one taken)
 */
export function computeDayStatusMap(
  startISO: string,
  endISO: string,
  medications: MedicationRow[],
  schedules: ScheduleRow[],
  doseLogs: DoseLogRow[],
): Record<string, DayStatus> {
  const logStatusMap = new Map(
    doseLogs.map((l) => [`${l.scheduled_date}|${l.schedule_id}|${l.time_label}`, l.status]),
  );

  const logsByDateSch = new Map<string, Set<string>>();
  for (const l of doseLogs) {
    const k = `${l.scheduled_date}|${l.schedule_id}`;
    let s = logsByDateSch.get(k);
    if (!s) {
      s = new Set();
      logsByDateSch.set(k, s);
    }
    s.add(l.time_label);
  }

  const map: Record<string, DayStatus> = {};
  const medIds = new Set(medications.map((m) => m.id));

  const current = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);

  while (current <= end) {
    const iso = toISO(current);
    const dayLabel = DAY_LABELS[current.getDay()];

    let total = 0;
    let completed = 0;
    let taken = 0;

    for (const sch of schedules) {
      if (!medIds.has(sch.medication_id)) continue;

      // Check if this schedule applies to this day
      if (sch.frequency === 'interval' && sch.interval_days) {
        if (!isIntervalDayMatch(sch.start_date, iso, sch.interval_days)) continue;
      } else if (sch.frequency !== 'daily') {
        if (!sch.selected_days.includes(dayLabel)) continue;
      }

      if (sch.start_date && iso < sch.start_date) continue;
      if (sch.end_date && iso > sch.end_date) continue;

      const currentTimes = new Set(sch.times_of_day);

      for (const label of sch.times_of_day) {
        total++;
        const status = logStatusMap.get(`${iso}|${sch.id}|${label}`);
        if (status) {
          completed++;
          if (status === 'taken') taken++;
        }
      }

      const loggedLabels = logsByDateSch.get(`${iso}|${sch.id}`);
      if (loggedLabels) {
        for (const label of loggedLabels) {
          if (!currentTimes.has(label)) {
            total++;
            completed++;
            const status = logStatusMap.get(`${iso}|${sch.id}|${label}`);
            if (status === 'taken') taken++;
          }
        }
      }
    }

    if (total === 0) {
      map[iso] = 'empty';
    } else if (completed === 0) {
      map[iso] = 'none';
    } else if (completed >= total && taken > 0) {
      map[iso] = 'all';
    } else {
      map[iso] = 'partial';
    }

    current.setDate(current.getDate() + 1);
  }

  return map;
}
