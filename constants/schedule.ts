/** Preset time slots with label, display time, icon, and sort order. */
export const TIME_SLOTS = [
  { label: 'Morning', time: '8:00 AM', icon: 'sunrise' as const, sortOrder: 480 },
  { label: 'Afternoon', time: '12:00 PM', icon: 'sun' as const, sortOrder: 720 },
  { label: 'Evening', time: '6:00 PM', icon: 'sunset' as const, sortOrder: 1080 },
  { label: 'Night', time: '10:00 PM', icon: 'moon' as const, sortOrder: 1320 },
] as const;

/** Quick lookup: preset label → { time, sortOrder }. */
export const TIME_SLOT_MAP: Record<string, { time: string; sortOrder: number }> =
  Object.fromEntries(TIME_SLOTS.map((s) => [s.label, { time: s.time, sortOrder: s.sortOrder }]));

/** Set of preset time-slot labels for distinguishing custom times. */
export const PRESET_LABELS: Set<string> = new Set(TIME_SLOTS.map((s) => s.label));

/** Frequency options for the schedule selector. */
export const FREQUENCY_OPTIONS = ['Daily', 'Weekly', 'Interval'] as const;

/** Snooze duration options for the reminders selector. */
export const SNOOZE_OPTIONS = ['30s', '5 min', '10 min', '15 min', '30 min'] as const;
