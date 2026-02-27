/**
 * Format a Date object to YYYY-MM-DD string in local timezone.
 * Avoids UTC shift issues from Date.toISOString().
 */
export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Format a YYYY-MM-DD string → human-readable (e.g. "Jan 15, 2025").
 */
export function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format hour (0-23) and minute into "h:mm AM/PM" string.
 */
export function formatHourMinute(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${h}:${m} ${ampm}`;
}

/**
 * Parse a time string like "8:00 AM" or "2:30 PM" into minutes since midnight.
 * Returns -1 if parsing fails.
 */
export function parseTimeToMinutes(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return -1;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Get a human-readable relative time string from an epoch timestamp.
 * e.g. "Just now", "5m ago", "2h ago", "Jan 15"
 */
export function getRelativeTime(date: number): string {
  const now = Date.now();
  const diff = now - date;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
