import type { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { WEEKDAY_NAMES } from '../constants/days';
import { formatHourMinute, getRelativeTime } from './date';

/** Represents a notification item for the listing screen. */
export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: 'scheduled' | 'delivered';
  /** ISO timestamp (delivered) or human-readable trigger description (scheduled) */
  timeInfo: string;
  /** Human-readable next fire date for scheduled notifications (e.g. "Today", "Tomorrow", "Mon, Mar 16") */
  dateInfo?: string;
  /** Sort key — minutes-from-midnight for scheduled, epoch ms for delivered */
  sortKey: number;
  medicationName?: string;
  /** The original notification data payload */
  data?: Record<string, unknown>;
};

/**
 * Compute the next fire date for a daily trigger (hour, minute).
 */
function nextDailyDate(hour: number, minute: number): Date {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

/**
 * Compute the next fire date for a weekly trigger (weekday 1=Sun..7=Sat, hour, minute).
 */
function nextWeeklyDate(weekday: number, hour: number, minute: number): Date {
  const now = new Date();
  // expo-notifications weekday: 1=Sun, 2=Mon, ..., 7=Sat → JS getDay: 0=Sun, 1=Mon, ..., 6=Sat
  const jsDay = weekday - 1;
  const today = now.getDay();
  let daysAhead = (jsDay - today + 7) % 7;
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  candidate.setDate(candidate.getDate() + daysAhead);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
  return candidate;
}

/**
 * Format a date as a relative/short label: "Today", "Tomorrow", or "Mon, Mar 16".
 */
function formatNextDate(date: Date): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(todayStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  if (date >= todayStart && date < tomorrowStart) return 'Today';
  if (date >= tomorrowStart && date < dayAfterTomorrow) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Describe a notification trigger in human-readable form with a sort key and next fire date.
 */
export function describeTrigger(trigger: Notifications.NotificationTrigger): {
  description: string;
  sortKey: number;
  dateInfo?: string;
} {
  if (!trigger || typeof trigger !== 'object') {
    return { description: 'Unknown', sortKey: 9999 };
  }

  const t = trigger as Record<string, unknown>;

  if (t.type === 'daily') {
    const hour = (t.hour as number) ?? 0;
    const minute = (t.minute as number) ?? 0;
    const nextDate = nextDailyDate(hour, minute);
    return {
      description: `Daily at ${formatHourMinute(hour, minute)}`,
      sortKey: hour * 60 + minute,
      dateInfo: formatNextDate(nextDate),
    };
  }

  if (t.type === 'weekly') {
    const hour = (t.hour as number) ?? 0;
    const minute = (t.minute as number) ?? 0;
    const weekday = (t.weekday as number) ?? 1;
    const dayName = WEEKDAY_NAMES[weekday] ?? '?';
    const nextDate = nextWeeklyDate(weekday, hour, minute);
    return {
      description: `Every ${dayName} at ${formatHourMinute(hour, minute)}`,
      sortKey: (weekday - 1) * 1440 + hour * 60 + minute,
      dateInfo: formatNextDate(nextDate),
    };
  }

  if (t.type === 'timeInterval') {
    const seconds = (t.seconds as number) ?? 0;
    const nextDate = new Date(Date.now() + seconds * 1000);
    if (seconds < 60) return { description: `In ${seconds}s`, sortKey: -seconds, dateInfo: formatNextDate(nextDate) };
    const mins = Math.round(seconds / 60);
    return { description: `In ${mins} min`, sortKey: -seconds, dateInfo: formatNextDate(nextDate) };
  }

  return { description: 'Scheduled', sortKey: 9999 };
}

/**
 * Determine which Feather icon to use for a notification based on its data payload.
 */
export function getNotificationIcon(
  data?: Record<string, unknown>,
): keyof typeof Feather.glyphMap {
  if (!data) return 'bell';
  if (data.type === 'medication-reminder' || data.medicationName) return 'clock';
  if (data.doseKey) return 'bell';
  return 'bell';
}

/**
 * Build grouped notification items from raw scheduled notifications.
 * Weekly triggers with the same scheduleId+timeLabel are merged into one entry.
 */
export function buildScheduledItems(
  scheduledNotifs: Notifications.NotificationRequest[],
): NotificationItem[] {
  const scheduledItems: NotificationItem[] = scheduledNotifs.map((n) => {
    const { description, sortKey, dateInfo } = describeTrigger(n.trigger);
    return {
      id: n.identifier,
      title: n.content.title ?? 'Notification',
      body: n.content.body ?? '',
      type: 'scheduled' as const,
      timeInfo: description,
      dateInfo,
      sortKey,
      medicationName: (n.content.data as Record<string, unknown>)
        ?.medicationName as string | undefined,
      data: n.content.data as Record<string, unknown> | undefined,
    };
  });

  // Group by medication + trigger description to de-duplicate weekly entries
  const groupedMap = new Map<
    string,
    NotificationItem & { days: string[]; count: number }
  >();
  for (const item of scheduledItems) {
    const data = item.data;
    const scheduleId = data?.scheduleId as string | undefined;
    const timeLabel = data?.timeLabel as string | undefined;
    const trigger = item.timeInfo;

    if (trigger.startsWith('Every ') && scheduleId && timeLabel) {
      const groupKey = `${scheduleId}-${timeLabel}`;
      const existing = groupedMap.get(groupKey);
      if (existing) {
        const dayMatch = trigger.match(/^Every (\w+) at/);
        if (dayMatch) existing.days.push(dayMatch[1]);
        existing.count += 1;
        if (item.sortKey < existing.sortKey) {
          existing.sortKey = item.sortKey;
          existing.dateInfo = item.dateInfo;
        }
      } else {
        const dayMatch = trigger.match(/^Every (\w+) at/);
        const timeMatch = trigger.match(/at (.+)$/);
        groupedMap.set(groupKey, {
          ...item,
          days: dayMatch ? [dayMatch[1]] : [],
          count: 1,
          timeInfo: timeMatch ? timeMatch[1] : trigger,
        });
      }
    } else {
      groupedMap.set(item.id, { ...item, days: [], count: 1 });
    }
  }

  // Build final list
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const finalScheduled: NotificationItem[] = [];
  for (const [, group] of groupedMap) {
    if (group.days.length > 0) {
      group.days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
      const allDays = group.days.length === 7 ? 'Every day' : group.days.join(', ');
      group.timeInfo = `${allDays} at ${group.timeInfo}`;
    }
    finalScheduled.push(group);
  }
  finalScheduled.sort((a, b) => a.sortKey - b.sortKey);

  return finalScheduled;
}

/**
 * Build notification items from delivered (presented) notifications.
 */
export function buildDeliveredItems(
  deliveredNotifs: Notifications.Notification[],
): NotificationItem[] {
  const items: NotificationItem[] = deliveredNotifs.map((n) => ({
    id: n.request.identifier,
    title: n.request.content.title ?? 'Notification',
    body: n.request.content.body ?? '',
    type: 'delivered' as const,
    timeInfo: getRelativeTime(n.date),
    sortKey: -n.date,
    medicationName: (n.request.content.data as Record<string, unknown>)
      ?.medicationName as string | undefined,
    data: n.request.content.data as Record<string, unknown> | undefined,
  }));
  items.sort((a, b) => a.sortKey - b.sortKey);
  return items;
}
