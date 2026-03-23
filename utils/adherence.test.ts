import {
  makeDoseLog,
  makeMedication,
  makeSchedule,
  resetIdCounter,
} from '../__fixtures__/database';
import { computeAdherence, computeStreak } from './adherence';

beforeEach(() => {
  resetIdCounter();
  jest.useFakeTimers();
  // Pin "now" to 2025-01-15 at 23:00 so all doses that day have passed
  jest.setSystemTime(new Date('2025-01-15T23:00:00'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('computeAdherence', () => {
  test('returns 0 for no schedules', () => {
    expect(computeAdherence('2025-01-13', '2025-01-15', [], [], [])).toBe(0);
  });

  test('returns 100 when all doses taken', () => {
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

    expect(computeAdherence('2025-01-13', '2025-01-15', [med], [sch], logs)).toBe(100);
  });

  test('returns 0 when no doses taken', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-13',
    });

    expect(computeAdherence('2025-01-13', '2025-01-15', [med], [sch], [])).toBe(0);
  });

  test('computes partial adherence', () => {
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
    ];

    // 1 taken out of 3 = 33%
    expect(computeAdherence('2025-01-13', '2025-01-15', [med], [sch], logs)).toBe(33);
  });

  test('excludes PRN medications', () => {
    const med = makeMedication({ id: 'med-1', is_prn: true });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-13',
    });

    expect(computeAdherence('2025-01-13', '2025-01-15', [med], [sch], [])).toBe(0);
  });

  test('skipped doses count as not taken', () => {
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

    // Skipped is not "taken", so 0 out of 3
    expect(computeAdherence('2025-01-13', '2025-01-15', [med], [sch], logs)).toBe(0);
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
    // Every 2 days from Jan 13: Jan 13, Jan 15 (Jan 14 skipped)
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
    expect(computeAdherence('2025-01-13', '2025-01-15', [med], [sch], logs)).toBe(100);
  });

  test('skips days before start_date', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-15',
    });
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-15',
        time_label: 'Morning',
        status: 'taken',
      }),
    ];
    // Only Jan 15 is in range (Jan 13-14 before start_date)
    expect(computeAdherence('2025-01-13', '2025-01-15', [med], [sch], logs)).toBe(100);
  });

  test('skips days after end_date', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-13',
      end_date: '2025-01-13',
    });
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-13',
        time_label: 'Morning',
        status: 'taken',
      }),
    ];
    expect(computeAdherence('2025-01-13', '2025-01-15', [med], [sch], logs)).toBe(100);
  });
});

describe('computeStreak', () => {
  test('returns 0 when yesterday was missed', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });

    expect(computeStreak('2025-01-15', [med], [sch], [])).toBe(0);
  });

  test('counts consecutive days', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-14',
        time_label: 'Morning',
        status: 'taken',
      }),
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-13',
        time_label: 'Morning',
        status: 'taken',
      }),
    ];

    expect(computeStreak('2025-01-15', [med], [sch], logs)).toBe(2);
  });

  test('streak breaks on missed day', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-14',
        time_label: 'Morning',
        status: 'taken',
      }),
      // 2025-01-13 missing — streak should be 1
    ];

    expect(computeStreak('2025-01-15', [med], [sch], logs)).toBe(1);
  });

  test('excludes PRN medications', () => {
    const med = makeMedication({ id: 'med-1', is_prn: true });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });

    // PRN meds are excluded, so no scheduled doses → streak skips those days
    expect(computeStreak('2025-01-15', [med], [sch], [])).toBe(0);
  });

  test('skips days with no scheduled doses', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'weekly',
      selected_days: ['Mon', 'Wed', 'Fri'],
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });
    // 2025-01-15 is Wed, 2025-01-14 is Tue (no schedule), 2025-01-13 is Mon (scheduled)
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-13',
        time_label: 'Morning',
        status: 'taken',
      }),
    ];

    // Tue is skipped (no scheduled doses), Mon is taken → streak 1
    expect(computeStreak('2025-01-15', [med], [sch], logs)).toBe(1);
  });

  test('handles interval frequency in streak', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'interval',
      interval_days: 2,
      times_of_day: ['Morning'],
      start_date: '2025-01-13',
    });
    // Every 2 days from Jan 13: Jan 13, Jan 15. Jan 14 is off-day.
    const logs = [
      makeDoseLog({
        schedule_id: 'sch-1',
        scheduled_date: '2025-01-13',
        time_label: 'Morning',
        status: 'taken',
      }),
    ];
    // Jan 14 has no doses (interval skip), Jan 13 is taken → streak 1
    expect(computeStreak('2025-01-15', [med], [sch], logs)).toBe(1);
  });

  test('streak respects start_date and end_date', () => {
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
    // Only Jan 14 is scheduled; Jan 13 has nothing → streak 1
    expect(computeStreak('2025-01-15', [med], [sch], logs)).toBe(1);
  });
});
