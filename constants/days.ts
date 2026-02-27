/** Abbreviated day labels indexed by JS Date.getDay() (Sunday = 0). */
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Ordered weekday names starting from Monday (used for day selectors). */
export const WEEKDAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Full month names indexed 0–11. */
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/**
 * Weekday names keyed by expo-notifications weekday number (1 = Sunday).
 * Used in the notifications listing screen.
 */
export const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Sun',
  2: 'Mon',
  3: 'Tue',
  4: 'Wed',
  5: 'Thu',
  6: 'Fri',
  7: 'Sat',
};
