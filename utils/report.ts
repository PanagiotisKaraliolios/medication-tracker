import { DAY_LABELS } from '../constants/days';
import { toISO } from './date';
import type { MedicationRow, ScheduleRow, DoseLogRow } from '../contexts/MedicationContext';

export type DayBar = { label: string; taken: number; total: number };

export type MissedDose = {
  medName: string;
  dateLabel: string;
  timeLabel: string;
};

/**
 * Build the full report dataset from raw DB data.
 */
export function buildReport(
  startISO: string,
  endISO: string,
  medications: MedicationRow[],
  schedules: ScheduleRow[],
  doseLogs: DoseLogRow[],
  periodDays: number,
) {
  const logMap = new Map(
    doseLogs.map((l) => [`${l.scheduled_date}|${l.schedule_id}|${l.time_label}`, l.status]),
  );
  const medMap = new Map(medications.map((m) => [m.id, m]));
  const medIds = new Set(medications.map((m) => m.id));

  let totalDoses = 0;
  let takenDoses = 0;
  let skippedDoses = 0;
  const missed: MissedDose[] = [];

  const dayBuckets = new Map<string, { taken: number; total: number }>();

  const current = new Date(startISO + 'T00:00:00');
  const end = new Date(endISO + 'T00:00:00');

  while (current <= end) {
    const iso = toISO(current);
    const dayLabel = DAY_LABELS[current.getDay()];
    let dayTaken = 0;
    let dayTotal = 0;

    for (const sch of schedules) {
      if (!medIds.has(sch.medication_id)) continue;
      if (!sch.selected_days.includes(dayLabel)) continue;
      if (sch.start_date && iso < sch.start_date) continue;
      if (sch.end_date && iso > sch.end_date) continue;

      for (const label of sch.times_of_day) {
        totalDoses++;
        dayTotal++;
        const status = logMap.get(`${iso}|${sch.id}|${label}`);
        if (status === 'taken') {
          takenDoses++;
          dayTaken++;
        } else if (status === 'skipped') {
          skippedDoses++;
        } else {
          const med = medMap.get(sch.medication_id);
          if (iso < toISO(new Date())) {
            missed.push({
              medName: med ? `${med.name} ${med.dosage}` : 'Unknown',
              dateLabel: new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
              timeLabel: label,
            });
          }
        }
      }
    }

    dayBuckets.set(iso, { taken: dayTaken, total: dayTotal });
    current.setDate(current.getDate() + 1);
  }

  const missedDoses = totalDoses - takenDoses - skippedDoses;
  const adherence = totalDoses === 0 ? 0 : Math.round((takenDoses / totalDoses) * 100);

  // Build chart bars — aggregate into 7 buckets regardless of period
  const chartBars: DayBar[] = [];
  const allDays = Array.from(dayBuckets.entries()).sort(([a], [b]) => a.localeCompare(b));

  if (periodDays <= 7) {
    for (const [iso, bucket] of allDays) {
      const d = new Date(iso + 'T00:00:00');
      chartBars.push({
        label: DAY_LABELS[d.getDay()],
        taken: bucket.taken,
        total: bucket.total,
      });
    }
  } else {
    const bucketCount = 7;
    const bucketSize = Math.ceil(allDays.length / bucketCount);
    for (let i = 0; i < bucketCount; i++) {
      const slice = allDays.slice(i * bucketSize, (i + 1) * bucketSize);
      if (slice.length === 0) continue;
      let taken = 0;
      let total = 0;
      for (const [, b] of slice) {
        taken += b.taken;
        total += b.total;
      }
      const firstDate = new Date(slice[0][0] + 'T00:00:00');
      chartBars.push({
        label: `${firstDate.getDate()}/${firstDate.getMonth() + 1}`,
        taken,
        total,
      });
    }
  }

  missed.sort((a, b) => b.dateLabel.localeCompare(a.dateLabel));
  const recentMissed = missed.slice(0, 10);

  return { adherence, totalDoses, takenDoses, missedDoses: Math.max(0, missedDoses), skippedDoses, chartBars, recentMissed };
}
