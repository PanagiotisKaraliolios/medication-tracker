import {
  makeDoseLog,
  makeMedication,
  makeSchedule,
  resetIdCounter,
} from '../__fixtures__/database';
import { computeDayStatusMap } from './calendar';

beforeEach(() => resetIdCounter());

describe('computeDayStatusMap', () => {
  test('returns "empty" when no schedules apply', () => {
    const result = computeDayStatusMap('2025-01-15', '2025-01-15', [], [], []);
    expect(result['2025-01-15']).toBe('empty');
  });

  test('returns "none" when doses scheduled but not logged', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });

    const result = computeDayStatusMap('2025-01-15', '2025-01-15', [med], [sch], []);
    expect(result['2025-01-15']).toBe('none');
  });

  test('returns "all" when all doses taken', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });
    const log = makeDoseLog({
      schedule_id: 'sch-1',
      medication_id: 'med-1',
      scheduled_date: '2025-01-15',
      time_label: 'Morning',
      status: 'taken',
    });

    const result = computeDayStatusMap('2025-01-15', '2025-01-15', [med], [sch], [log]);
    expect(result['2025-01-15']).toBe('all');
  });

  test('returns "partial" when some doses taken', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning', 'Evening'],
      start_date: '2025-01-01',
    });
    const log = makeDoseLog({
      schedule_id: 'sch-1',
      medication_id: 'med-1',
      scheduled_date: '2025-01-15',
      time_label: 'Morning',
      status: 'taken',
    });

    const result = computeDayStatusMap('2025-01-15', '2025-01-15', [med], [sch], [log]);
    expect(result['2025-01-15']).toBe('partial');
  });

  test('returns "partial" when all completed but none taken (all skipped)', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });
    const log = makeDoseLog({
      schedule_id: 'sch-1',
      medication_id: 'med-1',
      scheduled_date: '2025-01-15',
      time_label: 'Morning',
      status: 'skipped',
    });

    // completed >= total, but taken === 0 → partial (not 'all')
    const result = computeDayStatusMap('2025-01-15', '2025-01-15', [med], [sch], [log]);
    expect(result['2025-01-15']).toBe('partial');
  });

  test('computes multi-day range', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });
    const log = makeDoseLog({
      schedule_id: 'sch-1',
      medication_id: 'med-1',
      scheduled_date: '2025-01-15',
      time_label: 'Morning',
      status: 'taken',
    });

    const result = computeDayStatusMap('2025-01-14', '2025-01-16', [med], [sch], [log]);
    expect(result['2025-01-14']).toBe('none');
    expect(result['2025-01-15']).toBe('all');
    expect(result['2025-01-16']).toBe('none');
  });

  test('handles interval frequency schedule', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'interval',
      interval_days: 2,
      times_of_day: ['Morning'],
      start_date: '2025-01-14',
    });
    // Every 2 days from Jan 14: Jan 14, Jan 16. Jan 15 is off-day.
    const result = computeDayStatusMap('2025-01-14', '2025-01-16', [med], [sch], []);
    expect(result['2025-01-14']).toBe('none'); // scheduled but not taken
    expect(result['2025-01-15']).toBe('empty'); // off-day
    expect(result['2025-01-16']).toBe('none'); // scheduled but not taken
  });

  test('respects start_date boundary', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-16',
    });
    const result = computeDayStatusMap('2025-01-14', '2025-01-16', [med], [sch], []);
    expect(result['2025-01-14']).toBe('empty');
    expect(result['2025-01-15']).toBe('empty');
    expect(result['2025-01-16']).toBe('none');
  });

  test('respects end_date boundary', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
      end_date: '2025-01-14',
    });
    const result = computeDayStatusMap('2025-01-14', '2025-01-16', [med], [sch], []);
    expect(result['2025-01-14']).toBe('none');
    expect(result['2025-01-15']).toBe('empty');
    expect(result['2025-01-16']).toBe('empty');
  });

  test('includes orphaned dose logs in total', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });
    // Orphaned log for time_label no longer in schedule
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        medication_id: 'med-1',
        scheduled_date: '2025-01-15',
        time_label: 'Morning',
        status: 'taken',
      }),
      makeDoseLog({
        schedule_id: 'sch-1',
        medication_id: 'med-1',
        scheduled_date: '2025-01-15',
        time_label: 'Evening',
        status: 'taken',
      }),
    ];

    // Morning (scheduled) + Evening (orphaned) = 2 total, 2 completed, 2 taken → 'all'
    const result = computeDayStatusMap('2025-01-15', '2025-01-15', [med], [sch], logs);
    expect(result['2025-01-15']).toBe('all');
  });
});
