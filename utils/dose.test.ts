import {
  makeDoseLog,
  makeMedication,
  makeSchedule,
  resetIdCounter,
} from '../__fixtures__/database';
import { buildTodayDoses, isIntervalDayMatch, resolveTimeSlot } from './dose';

beforeEach(() => resetIdCounter());

describe('resolveTimeSlot', () => {
  test('resolves preset "Morning"', () => {
    const result = resolveTimeSlot('Morning');
    expect(result).toEqual({ time: '8:00 AM', sortOrder: 480 });
  });

  test('resolves preset "Afternoon"', () => {
    const result = resolveTimeSlot('Afternoon');
    expect(result).toEqual({ time: '12:00 PM', sortOrder: 720 });
  });

  test('resolves preset "Evening"', () => {
    const result = resolveTimeSlot('Evening');
    expect(result).toEqual({ time: '6:00 PM', sortOrder: 1080 });
  });

  test('resolves preset "Night"', () => {
    const result = resolveTimeSlot('Night');
    expect(result).toEqual({ time: '10:00 PM', sortOrder: 1320 });
  });

  test('resolves custom time "8:30 AM"', () => {
    const result = resolveTimeSlot('8:30 AM');
    expect(result).toEqual({ time: '8:30 AM', sortOrder: 510 });
  });

  test('returns sortOrder 9999 for unparseable time', () => {
    const result = resolveTimeSlot('invalid');
    expect(result.sortOrder).toBe(9999);
  });
});

describe('isIntervalDayMatch', () => {
  test('matches on start date itself', () => {
    expect(isIntervalDayMatch('2025-01-01', '2025-01-01', 2)).toBe(true);
  });

  test('matches on correct interval day', () => {
    // Every 3 days from Jan 1: Jan 1, Jan 4, Jan 7...
    expect(isIntervalDayMatch('2025-01-01', '2025-01-04', 3)).toBe(true);
  });

  test('does not match on non-interval day', () => {
    expect(isIntervalDayMatch('2025-01-01', '2025-01-03', 3)).toBe(false);
  });

  test('does not match before start date', () => {
    expect(isIntervalDayMatch('2025-01-05', '2025-01-01', 2)).toBe(false);
  });
});

describe('buildTodayDoses', () => {
  test('returns empty array for no schedules', () => {
    expect(buildTodayDoses([], [], [], 'Mon')).toEqual([]);
  });

  test('builds dose for daily schedule', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
    });

    const doses = buildTodayDoses([med], [sch], [], 'Mon', '2025-01-06');
    expect(doses).toHaveLength(1);
    expect(doses[0].name).toBe('Aspirin');
    expect(doses[0].timeLabel).toBe('Morning');
    expect(doses[0].status).toBe('pending');
  });

  test('skips weekly schedule on non-matching day', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'weekly',
      selected_days: ['Mon', 'Wed', 'Fri'],
      times_of_day: ['Morning'],
    });

    const doses = buildTodayDoses([med], [sch], [], 'Tue', '2025-01-07');
    expect(doses).toHaveLength(0);
  });

  test('includes weekly schedule on matching day', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'weekly',
      selected_days: ['Mon', 'Wed'],
      times_of_day: ['Morning'],
    });

    const doses = buildTodayDoses([med], [sch], [], 'Mon', '2025-01-06');
    expect(doses).toHaveLength(1);
  });

  test('maps dose log status correctly', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
    });
    const log = makeDoseLog({
      schedule_id: 'sch-1',
      medication_id: 'med-1',
      time_label: 'Morning',
      status: 'taken',
    });

    const doses = buildTodayDoses([med], [sch], [log], 'Mon', '2025-01-06');
    expect(doses[0].status).toBe('taken');
  });

  test('sorts doses by sortOrder', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Night', 'Morning'],
    });

    const doses = buildTodayDoses([med], [sch], [], 'Mon', '2025-01-06');
    expect(doses[0].timeLabel).toBe('Morning');
    expect(doses[1].timeLabel).toBe('Night');
  });

  test('handles interval frequency schedule on matching day', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'interval',
      interval_days: 3,
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });
    // Every 3 days from Jan 1: Jan 1, Jan 4, Jan 7 (Jan 6 = off-day)
    const doses = buildTodayDoses([med], [sch], [], 'Tue', '2025-01-07');
    expect(doses).toHaveLength(1);
  });

  test('skips interval frequency schedule on non-matching day', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'interval',
      interval_days: 3,
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
    });
    // Jan 6 is NOT an interval day (offset 5, 5 % 3 ≠ 0)
    const doses = buildTodayDoses([med], [sch], [], 'Mon', '2025-01-06');
    expect(doses).toHaveLength(0);
  });

  test('skips schedule before start_date', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-02-01',
    });

    const doses = buildTodayDoses([med], [sch], [], 'Mon', '2025-01-06');
    expect(doses).toHaveLength(0);
  });

  test('skips schedule after end_date', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
      end_date: '2025-01-05',
    });

    const doses = buildTodayDoses([med], [sch], [], 'Mon', '2025-01-06');
    expect(doses).toHaveLength(0);
  });

  test('includes orphaned dose logs', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
    });
    // Log for a time_label no longer in the schedule
    const orphanLog = makeDoseLog({
      schedule_id: 'sch-1',
      medication_id: 'med-1',
      time_label: 'Evening',
      status: 'taken',
    });

    const doses = buildTodayDoses([med], [sch], [orphanLog], 'Mon', '2025-01-06');
    const orphan = doses.find((d) => d.timeLabel === 'Evening');
    expect(orphan).toBeDefined();
    expect(orphan?.status).toBe('taken');
  });

  test('skips schedule whose medication_id has no matching medication', () => {
    const med = makeMedication({ id: 'med-1' });
    const orphanSch = makeSchedule({
      id: 'sch-orphan',
      medication_id: 'med-nonexistent',
      frequency: 'daily',
      times_of_day: ['Morning'],
    });

    const doses = buildTodayDoses([med], [orphanSch], [], 'Mon', '2025-01-06');
    expect(doses).toHaveLength(0);
  });

  test('orphan loop skips logs whose schedule_id does not match current schedule', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'daily',
      times_of_day: ['Morning'],
    });
    // Log belongs to a different schedule
    const unmatchedLog = makeDoseLog({
      schedule_id: 'sch-other',
      medication_id: 'med-1',
      time_label: 'Evening',
      status: 'taken',
    });

    const doses = buildTodayDoses([med], [sch], [unmatchedLog], 'Mon', '2025-01-06');
    // Only the scheduled Morning dose should appear, not the unmatched log
    expect(doses).toHaveLength(1);
    expect(doses[0].timeLabel).toBe('Morning');
  });

  test('interval schedule without dateISO falls through to selected_days check', () => {
    const med = makeMedication({ id: 'med-1' });
    const sch = makeSchedule({
      id: 'sch-1',
      medication_id: 'med-1',
      frequency: 'interval',
      interval_days: 2,
      times_of_day: ['Morning'],
      start_date: '2025-01-01',
      selected_days: ['Mon'],
    });

    // dateISO is undefined — the interval branch guard fails, falls to else-if
    // todayLabel 'Mon' matches selected_days
    const doses = buildTodayDoses([med], [sch], [], 'Mon');
    expect(doses).toHaveLength(1);
  });
});
