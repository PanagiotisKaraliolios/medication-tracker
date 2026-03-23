import { makeSymptom, resetIdCounter } from '../__fixtures__/database';
import { buildSymptomSummary, groupSymptomsByDate } from './symptom';

beforeEach(() => resetIdCounter());

describe('buildSymptomSummary', () => {
  test('returns empty summary for no symptoms', () => {
    const result = buildSymptomSummary([]);
    expect(result.totalCount).toBe(0);
    expect(result.uniqueSymptoms).toEqual([]);
    expect(result.mostFrequent).toBeNull();
    expect(result.severityBreakdown).toEqual({ mild: 0, moderate: 0, severe: 0 });
  });

  test('counts single symptom', () => {
    const result = buildSymptomSummary([makeSymptom({ severity: 'mild' })]);
    expect(result.totalCount).toBe(1);
    expect(result.uniqueSymptoms).toEqual(['Headache']);
    expect(result.mostFrequent).toBe('Headache');
    expect(result.severityBreakdown.mild).toBe(1);
  });

  test('tracks severity breakdown', () => {
    const symptoms = [
      makeSymptom({ severity: 'mild' }),
      makeSymptom({ severity: 'moderate' }),
      makeSymptom({ severity: 'severe' }),
      makeSymptom({ severity: 'severe' }),
    ];
    const result = buildSymptomSummary(symptoms);
    expect(result.severityBreakdown).toEqual({ mild: 1, moderate: 1, severe: 2 });
  });

  test('finds most frequent symptom', () => {
    const symptoms = [
      makeSymptom({ name: 'Headache' }),
      makeSymptom({ name: 'Headache' }),
      makeSymptom({ name: 'Nausea' }),
    ];
    const result = buildSymptomSummary(symptoms);
    expect(result.mostFrequent).toBe('Headache');
    expect(result.uniqueSymptoms).toContain('Headache');
    expect(result.uniqueSymptoms).toContain('Nausea');
  });

  test('groups by day', () => {
    const symptoms = [
      makeSymptom({ logged_date: '2025-01-15' }),
      makeSymptom({ logged_date: '2025-01-15' }),
      makeSymptom({ logged_date: '2025-01-16' }),
    ];
    const result = buildSymptomSummary(symptoms);
    expect(result.byDay.get('2025-01-15')?.length).toBe(2);
    expect(result.byDay.get('2025-01-16')?.length).toBe(1);
  });
});

describe('groupSymptomsByDate', () => {
  test('returns empty map for empty array', () => {
    expect(groupSymptomsByDate([]).size).toBe(0);
  });

  test('groups symptoms by logged_date', () => {
    const symptoms = [
      makeSymptom({ logged_date: '2025-01-15' }),
      makeSymptom({ logged_date: '2025-01-15' }),
      makeSymptom({ logged_date: '2025-01-16' }),
    ];
    const result = groupSymptomsByDate(symptoms);
    expect(result.size).toBe(2);
    expect(result.get('2025-01-15')?.length).toBe(2);
    expect(result.get('2025-01-16')?.length).toBe(1);
  });
});
