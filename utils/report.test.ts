import {
  makeDoseLog,
  makeMedication,
  makeSchedule,
  resetIdCounter,
} from '../__fixtures__/database';
import { buildReport } from './report';

beforeEach(() => {
  resetIdCounter();
  jest.useFakeTimers();
  // Pin to 2025-01-15 at 23:00 so all doses that day have passed
  jest.setSystemTime(new Date('2025-01-15T23:00:00'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('buildReport', () => {
  test('returns zero values for empty data', () => {
    const result = buildReport('2025-01-13', '2025-01-15', [], [], [], 3);
    expect(result.adherence).toBe(0);
    expect(result.totalDoses).toBe(0);
    expect(result.takenDoses).toBe(0);
    expect(result.missedDoses).toBe(0);
    expect(result.skippedDoses).toBe(0);
    expect(result.recentMissed).toEqual([]);
    expect(result.prnUsage).toEqual([]);
  });

  test('computes 100% adherence', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-13',
    });
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-13',
        time_label: 'Morning',
        status: 'taken',
      }),
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-14',
        time_label: 'Morning',
        status: 'taken',
      }),
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-15',
        time_label: 'Morning',
        status: 'taken',
      }),
    ];

    const result = buildReport('2025-01-13', '2025-01-15', [med], [sch], logs, 3);
    expect(result.adherence).toBe(100);
    expect(result.takenDoses).toBe(3);
    expect(result.totalDoses).toBe(3);
    expect(result.missedDoses).toBe(0);
  });

  test('counts skipped doses', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-13',
    });
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-13',
        time_label: 'Morning',
        status: 'skipped',
      }),
    ];

    const result = buildReport('2025-01-13', '2025-01-15', [med], [sch], logs, 3);
    expect(result.skippedDoses).toBe(1);
  });

  test('generates individual bars for <= 7 days', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-13',
    });

    const result = buildReport('2025-01-13', '2025-01-15', [med], [sch], [], 3);
    expect(result.chartBars).toHaveLength(3);
  });

  test('generates bucketed bars for > 7 days', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });

    const result = buildReport('2025-01-01', '2025-01-15', [med], [sch], [], 15);
    expect(result.chartBars.length).toBeLessThanOrEqual(7);
  });

  test('excludes PRN from adherence but tracks PRN usage', () => {
    const regularMed = makeMedication({ id: 'med-1', is_prn: false });
    const prnMed = makeMedication({
      id: 'med-2',
      is_prn: true,
      name: 'Ibuprofen',
      dosage: '400mg',
    });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-13',
    });
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-13',
        time_label: 'Morning',
        status: 'taken',
      }),
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-14',
        time_label: 'Morning',
        status: 'taken',
      }),
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-15',
        time_label: 'Morning',
        status: 'taken',
      }),
      // PRN log (no schedule_id)
      makeDoseLog({
        schedule_id: null,
        medication_id: 'med-2',
        scheduled_date: '2025-01-14',
        time_label: 'PRN',
        status: 'taken',
      }),
    ];

    const result = buildReport('2025-01-13', '2025-01-15', [regularMed, prnMed], [sch], logs, 3);
    expect(result.adherence).toBe(100);
    expect(result.prnUsage).toEqual([{ name: 'Ibuprofen 400mg', count: 1 }]);
  });

  test('handles interval frequency schedules', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'interval',
      interval_days: 2,
      times_of_day: ['Morning'],
      start_date: '2025-01-13',
    });
    // Every 2 days from Jan 13: Jan 13, Jan 15
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-13',
        time_label: 'Morning',
        status: 'taken',
      }),
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-15',
        time_label: 'Morning',
        status: 'taken',
      }),
    ];
    const result = buildReport('2025-01-13', '2025-01-15', [med], [sch], logs, 3);
    expect(result.adherence).toBe(100);
    expect(result.totalDoses).toBe(2);
  });

  test('respects start_date and end_date boundaries', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-14',
      end_date: '2025-01-14',
    });
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-14',
        time_label: 'Morning',
        status: 'taken',
      }),
    ];
    const result = buildReport('2025-01-13', '2025-01-15', [med], [sch], logs, 3);
    expect(result.totalDoses).toBe(1);
    expect(result.adherence).toBe(100);
  });

  test('caps recent missed at 10', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning', 'Afternoon', 'Evening'],
      start_date: '2025-01-01',
    });
    // No logs → all missed. 15 days × 3 doses = 45 missed
    // But recentMissed capped at 10
    const result = buildReport('2025-01-01', '2025-01-15', [med], [sch], [], 15);
    expect(result.recentMissed.length).toBeLessThanOrEqual(10);
  });
});
