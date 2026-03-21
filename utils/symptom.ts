import type { SymptomRow } from '../types/database';

export type SymptomSummary = {
  totalCount: number;
  uniqueSymptoms: string[];
  symptomCounts: Map<string, number>;
  mostFrequent: string | null;
  severityBreakdown: { mild: number; moderate: number; severe: number };
  byDay: Map<string, SymptomRow[]>;
};

/** Aggregate symptom data for reports. */
export function buildSymptomSummary(symptoms: SymptomRow[]): SymptomSummary {
  const severityBreakdown = { mild: 0, moderate: 0, severe: 0 };
  const nameCount = new Map<string, number>();
  const byDay = new Map<string, SymptomRow[]>();

  for (const s of symptoms) {
    severityBreakdown[s.severity]++;
    nameCount.set(s.name, (nameCount.get(s.name) ?? 0) + 1);

    const day = s.logged_date;
    const arr = byDay.get(day) ?? [];
    arr.push(s);
    byDay.set(day, arr);
  }

  const uniqueSymptoms = Array.from(nameCount.keys());

  let mostFrequent: string | null = null;
  let maxCount = 0;
  for (const [name, count] of nameCount) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequent = name;
    }
  }

  return {
    totalCount: symptoms.length,
    uniqueSymptoms,
    symptomCounts: nameCount,
    mostFrequent,
    severityBreakdown,
    byDay,
  };
}

/** Group symptoms by date for calendar/list views. */
export function groupSymptomsByDate(symptoms: SymptomRow[]): Map<string, SymptomRow[]> {
  const map = new Map<string, SymptomRow[]>();
  for (const s of symptoms) {
    const arr = map.get(s.logged_date) ?? [];
    arr.push(s);
    map.set(s.logged_date, arr);
  }
  return map;
}
