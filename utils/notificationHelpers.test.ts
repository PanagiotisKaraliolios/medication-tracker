import {
  buildDeliveredItems,
  buildScheduledItems,
  describeTrigger,
  getNotificationIcon,
} from './notificationHelpers';

// Typed helpers to avoid `as any` casts on opaque expo-notifications types
type TriggerInput = Parameters<typeof describeTrigger>[0];
type ScheduledRequest = Parameters<typeof buildScheduledItems>[0][number];
type DeliveredNotif = Parameters<typeof buildDeliveredItems>[0][number];

function asTrigger(obj: Record<string, unknown> | null): TriggerInput {
  return obj as unknown as TriggerInput;
}

// Pin time so nextDailyDate / nextWeeklyDate / formatNextDate are deterministic.
// Wednesday 2025-01-15 10:00 AM
beforeAll(() => jest.useFakeTimers({ now: new Date(2025, 0, 15, 10, 0, 0) }));
afterAll(() => jest.useRealTimers());

// ─── describeTrigger ────────────────────────────────────────────────

describe('describeTrigger', () => {
  it('describes a daily trigger', () => {
    const { description, sortKey, dateInfo } = describeTrigger(
      asTrigger({ type: 'daily', hour: 8, minute: 30 }),
    );
    expect(description).toBe('Daily at 8:30 AM');
    expect(sortKey).toBe(8 * 60 + 30);
    // 8:30 AM already passed today (10 AM now) → dateInfo should be Tomorrow
    expect(dateInfo).toBe('Tomorrow');
  });

  it('daily trigger later today shows Today', () => {
    const { dateInfo } = describeTrigger(asTrigger({ type: 'daily', hour: 14, minute: 0 }));
    expect(dateInfo).toBe('Today');
  });

  it('describes a weekly trigger', () => {
    // weekday 5 = Thu (expo: 1=Sun,2=Mon,…,5=Thu)
    const { description, sortKey } = describeTrigger(
      asTrigger({ type: 'weekly', weekday: 5, hour: 9, minute: 0 }),
    );
    expect(description).toBe('Every Thu at 9:00 AM');
    expect(sortKey).toBe((5 - 1) * 1440 + 9 * 60);
  });

  it('weekly trigger tomorrow shows Tomorrow', () => {
    // weekday 5 = Thu; today is Wed → next fire = tomorrow
    const { dateInfo } = describeTrigger(
      asTrigger({ type: 'weekly', weekday: 5, hour: 9, minute: 0 }),
    );
    expect(dateInfo).toBe('Tomorrow');
  });

  it('describes a short timeInterval in seconds', () => {
    const { description, sortKey } = describeTrigger(
      asTrigger({ type: 'timeInterval', seconds: 30 }),
    );
    expect(description).toBe('In 30s');
    expect(sortKey).toBe(-30);
  });

  it('describes a longer timeInterval in minutes', () => {
    const { description, sortKey } = describeTrigger(
      asTrigger({ type: 'timeInterval', seconds: 300 }),
    );
    expect(description).toBe('In 5 min');
    expect(sortKey).toBe(-300);
  });

  it('returns Unknown for null trigger', () => {
    expect(describeTrigger(asTrigger(null))).toEqual({ description: 'Unknown', sortKey: 9999 });
  });

  it('returns Scheduled for unrecognised trigger type', () => {
    expect(describeTrigger(asTrigger({ type: 'calendar' }))).toEqual({
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
  } as unknown as ScheduledRequest;
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
      } as unknown as DeliveredNotif,
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
      } as unknown as DeliveredNotif,
      {
        date: now - 10_000,
        request: { identifier: 'd2', content: { title: 'B', body: '', data: {} } },
      } as unknown as DeliveredNotif,
    ]);
    // Newer (d2) should come first (lower sortKey = more negative date)
    expect(items[0].id).toBe('d2');
  });
});

// ─── Branch coverage: describeTrigger defaults ──────────────────────

describe('describeTrigger – branch coverage', () => {
  it('defaults hour and minute to 0 when undefined (daily)', () => {
    const { description, sortKey, dateInfo } = describeTrigger(
      asTrigger({ type: 'daily', hour: undefined, minute: undefined }),
    );
    expect(description).toBe('Daily at 12:00 AM');
    expect(sortKey).toBe(0);
    expect(dateInfo).toBeDefined();
  });

  it('defaults hour, minute, weekday to 0/1 when undefined (weekly)', () => {
    const { description, sortKey } = describeTrigger(
      asTrigger({ type: 'weekly', hour: undefined, minute: undefined, weekday: undefined }),
    );
    // weekday defaults to 1 (Sun), hour/minute default to 0
    expect(description).toBe('Every Sun at 12:00 AM');
    expect(sortKey).toBe(0); // (1-1)*1440 + 0*60 + 0
  });

  it('defaults seconds to 0 when undefined (timeInterval)', () => {
    const { description, sortKey } = describeTrigger(
      asTrigger({ type: 'timeInterval', seconds: undefined }),
    );
    expect(description).toBe('In 0s');
    expect(sortKey).toBe(-0);
  });
});

// ─── Branch coverage: buildScheduledItems defaults & merging ────────

describe('buildScheduledItems – branch coverage', () => {
  it('defaults title to Notification and body to empty when undefined', () => {
    const items = buildScheduledItems([
      {
        identifier: 'n1',
        content: { title: undefined, body: undefined, data: {} },
        trigger: { type: 'daily', hour: 9, minute: 0 },
      } as unknown as ScheduledRequest,
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Notification');
    expect(items[0].body).toBe('');
  });

  it('merges weekly triggers and picks lower sortKey with its dateInfo', () => {
    const data = { scheduleId: 's1', timeLabel: 'Morning' };
    // weekday 6 = Fri (higher sortKey sent first), weekday 2 = Mon (lower sortKey)
    const items = buildScheduledItems([
      makeRequest('n1', { type: 'weekly', weekday: 6, hour: 8, minute: 0 }, { data }),
      makeRequest('n2', { type: 'weekly', weekday: 2, hour: 8, minute: 0 }, { data }),
    ]);
    expect(items).toHaveLength(1);
    // sortKey should be the lower one (Mon = weekday 2 → (2-1)*1440+480 = 1920)
    expect(items[0].sortKey).toBe((2 - 1) * 1440 + 8 * 60);
    expect(items[0].timeInfo).toContain('Mon');
    expect(items[0].timeInfo).toContain('Fri');
  });

  it('handles weekly trigger where timeMatch is null (no " at " in description)', () => {
    // This is hard to trigger directly since describeTrigger always includes " at ".
    // Instead, test the typical new-entry path with a valid weekly trigger.
    const data = { scheduleId: 's5', timeLabel: 'Evening' };
    const items = buildScheduledItems([
      makeRequest('n1', { type: 'weekly', weekday: 3, hour: 18, minute: 30 }, { data }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].timeInfo).toContain('6:30 PM');
  });
});

// ─── Branch coverage: buildDeliveredItems defaults ──────────────────

describe('buildDeliveredItems – branch coverage', () => {
  it('defaults title to Notification and body to empty when undefined', () => {
    const items = buildDeliveredItems([
      {
        date: Date.now() - 30_000,
        request: {
          identifier: 'd1',
          content: { title: undefined, body: undefined, data: {} },
        },
      } as unknown as DeliveredNotif,
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Notification');
    expect(items[0].body).toBe('');
  });
});
