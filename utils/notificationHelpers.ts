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
  /** Sort key — minutes-from-midnight for scheduled, epoch ms for delivered */
  sortKey: number;
  medicationName?: string;
  /** The original notification data payload */
  data?: Record<string, unknown>;
};

/**
 * Describe a notification trigger in human-readable form with a sort key.
 */
export function describeTrigger(trigger: Notifications.NotificationTrigger): {
  description: string;
  sortKey: number;
} {
  if (!trigger || typeof trigger !== 'object') {
    return { description: 'Unknown', sortKey: 9999 };
  }

  const t = trigger as Record<string, unknown>;

  if (t.type === 'daily') {
    const hour = (t.hour as number) ?? 0;
    const minute = (t.minute as number) ?? 0;
    return {
      description: `Daily at ${formatHourMinute(hour, minute)}`,
      sortKey: hour * 60 + minute,
    };
  }

  if (t.type === 'weekly') {
    const hour = (t.hour as number) ?? 0;
    const minute = (t.minute as number) ?? 0;
    const weekday = (t.weekday as number) ?? 1;
    const dayName = WEEKDAY_NAMES[weekday] ?? '?';
    return {
      description: `Every ${dayName} at ${formatHourMinute(hour, minute)}`,
      sortKey: (weekday - 1) * 1440 + hour * 60 + minute,
    };
  }

  if (t.type === 'timeInterval') {
    const seconds = (t.seconds as number) ?? 0;
    if (seconds < 60) return { description: `In ${seconds}s`, sortKey: -seconds };
    const mins = Math.round(seconds / 60);
    return { description: `In ${mins} min`, sortKey: -seconds };
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
    const { description, sortKey } = describeTrigger(n.trigger);
    return {
      id: n.identifier,
      title: n.content.title ?? 'Notification',
      body: n.content.body ?? '',
      type: 'scheduled' as const,
      timeInfo: description,
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
        if (item.sortKey < existing.sortKey) existing.sortKey = item.sortKey;
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
