import {
  buildDeliveredItems,
  buildScheduledItems,
  describeTrigger,
  getNotificationIcon,
} from './notificationHelpers';

// Pin time so nextDailyDate / nextWeeklyDate / formatNextDate are deterministic.
// Wednesday 2025-01-15 10:00 AM
beforeAll(() => jest.useFakeTimers({ now: new Date(2025, 0, 15, 10, 0, 0) }));
afterAll(() => jest.useRealTimers());

// ─── describeTrigger ────────────────────────────────────────────────

describe('describeTrigger', () => {
  it('describes a daily trigger', () => {
    const { description, sortKey, dateInfo } = describeTrigger({
      type: 'daily',
      hour: 8,
      minute: 30,
    } as any);
    expect(description).toBe('Daily at 8:30 AM');
    expect(sortKey).toBe(8 * 60 + 30);
    // 8:30 AM already passed today (10 AM now) → dateInfo should be Tomorrow
    expect(dateInfo).toBe('Tomorrow');
  });

  it('daily trigger later today shows Today', () => {
    const { dateInfo } = describeTrigger({
      type: 'daily',
      hour: 14,
      minute: 0,
    } as any);
    expect(dateInfo).toBe('Today');
  });

  it('describes a weekly trigger', () => {
    // weekday 5 = Thu (expo: 1=Sun,2=Mon,…,5=Thu)
    const { description, sortKey } = describeTrigger({
      type: 'weekly',
      weekday: 5,
      hour: 9,
      minute: 0,
    } as any);
    expect(description).toBe('Every Thu at 9:00 AM');
    expect(sortKey).toBe((5 - 1) * 1440 + 9 * 60);
  });

  it('weekly trigger tomorrow shows Tomorrow', () => {
    // weekday 5 = Thu; today is Wed → next fire = tomorrow
    const { dateInfo } = describeTrigger({
      type: 'weekly',
      weekday: 5,
      hour: 9,
      minute: 0,
    } as any);
    expect(dateInfo).toBe('Tomorrow');
  });

  it('describes a short timeInterval in seconds', () => {
    const { description, sortKey } = describeTrigger({
      type: 'timeInterval',
      seconds: 30,
    } as any);
    expect(description).toBe('In 30s');
    expect(sortKey).toBe(-30);
  });

  it('describes a longer timeInterval in minutes', () => {
    const { description, sortKey } = describeTrigger({
      type: 'timeInterval',
      seconds: 300,
    } as any);
    expect(description).toBe('In 5 min');
    expect(sortKey).toBe(-300);
  });

  it('returns Unknown for null trigger', () => {
    expect(describeTrigger(null as any)).toEqual({ description: 'Unknown', sortKey: 9999 });
  });

  it('returns Scheduled for unrecognised trigger type', () => {
    expect(describeTrigger({ type: 'calendar' } as any)).toEqual({
      description: 'Scheduled',
      sortKey: 9999,
    });
  });
});

// ─── getNotificationIcon ────────────────────────────────────────────

describe('getNotificationIcon', () => {
  it('returns clock for medication-reminder type', () => {
    expect(getNotificationIcon({ type: 'medication-reminder' })).toBe('clock');
  });

  it('returns clock when medicationName present', () => {
    expect(getNotificationIcon({ medicationName: 'Aspirin' })).toBe('clock');
  });

  it('returns bell for doseKey data', () => {
    expect(getNotificationIcon({ doseKey: 'abc' })).toBe('bell');
  });

  it('returns bell when no data', () => {
    expect(getNotificationIcon()).toBe('bell');
    expect(getNotificationIcon(undefined)).toBe('bell');
  });
});

// ─── buildScheduledItems ────────────────────────────────────────────

function makeRequest(
  id: string,
  trigger: Record<string, unknown>,
  overrides: { title?: string; body?: string; data?: Record<string, unknown> } = {},
) {
  return {
    identifier: id,
    content: {
      title: overrides.title ?? 'Take medication',
      body: overrides.body ?? '',
      data: overrides.data ?? {},
    },
    trigger,
  } as any;
}

describe('buildScheduledItems', () => {
  it('maps a single daily notification', () => {
    const items = buildScheduledItems([makeRequest('n1', { type: 'daily', hour: 8, minute: 0 })]);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('scheduled');
    expect(items[0].timeInfo).toBe('Daily at 8:00 AM');
  });

  it('merges weekly triggers with same scheduleId+timeLabel', () => {
    const data = { scheduleId: 's1', timeLabel: 'Morning' };
    const items = buildScheduledItems([
      makeRequest('n1', { type: 'weekly', weekday: 2, hour: 8, minute: 0 }, { data }),
      makeRequest('n2', { type: 'weekly', weekday: 3, hour: 8, minute: 0 }, { data }),
      makeRequest('n3', { type: 'weekly', weekday: 4, hour: 8, minute: 0 }, { data }),
    ]);
    // Three weekly entries for same schedule → merged into one
    expect(items).toHaveLength(1);
    expect(items[0].timeInfo).toContain('Mon, Tue, Wed');
    expect(items[0].timeInfo).toContain('8:00 AM');
  });

  it('updates dateInfo when later entry has lower sortKey', () => {
    const data = { scheduleId: 's1', timeLabel: 'Morning' };
    // Send in descending weekday order so second entry has lower sortKey
    const items = buildScheduledItems([
      makeRequest('n1', { type: 'weekly', weekday: 5, hour: 8, minute: 0 }, { data }),
      makeRequest('n2', { type: 'weekly', weekday: 2, hour: 8, minute: 0 }, { data }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].timeInfo).toContain('Mon');
    expect(items[0].timeInfo).toContain('Thu');
  });

  it('keeps different schedules separate', () => {
    const items = buildScheduledItems([
      makeRequest('n1', { type: 'daily', hour: 8, minute: 0 }, { data: { scheduleId: 's1' } }),
      makeRequest('n2', { type: 'daily', hour: 14, minute: 0 }, { data: { scheduleId: 's2' } }),
    ]);
    expect(items).toHaveLength(2);
  });

  it('sorts by sortKey', () => {
    const items = buildScheduledItems([
      makeRequest('n1', { type: 'daily', hour: 20, minute: 0 }),
      makeRequest('n2', { type: 'daily', hour: 8, minute: 0 }),
    ]);
    expect(items[0].sortKey).toBeLessThan(items[1].sortKey);
  });
});

// ─── buildDeliveredItems ────────────────────────────────────────────

describe('buildDeliveredItems', () => {
  it('maps delivered notifications', () => {
    const items = buildDeliveredItems([
      {
        date: Date.now() - 60_000,
        request: {
          identifier: 'd1',
          content: { title: 'Taken!', body: 'Aspirin', data: { medicationName: 'Aspirin' } },
        },
      } as any,
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('delivered');
    expect(items[0].medicationName).toBe('Aspirin');
  });

  it('sorts delivered items newest first', () => {
    const now = Date.now();
    const items = buildDeliveredItems([
      {
        date: now - 120_000,
        request: { identifier: 'd1', content: { title: 'A', body: '', data: {} } },
      } as any,
      {
        date: now - 10_000,
        request: { identifier: 'd2', content: { title: 'B', body: '', data: {} } },
      } as any,
    ]);
    // Newer (d2) should come first (lower sortKey = more negative date)
    expect(items[0].id).toBe('d2');
  });
});
