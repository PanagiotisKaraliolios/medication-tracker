/**
 * Parse snooze duration string (e.g. '5 min' or '30s') to milliseconds.
 */
export function parseSnoozeDuration(duration: string): number {
  if (duration.endsWith('s') && !duration.includes('min')) {
    const secs = parseInt(duration, 10);
    return (Number.isNaN(secs) ? 30 : secs) * 1000;
  }
  const match = duration.match(/(\d+)/);
  const minutes = match ? parseInt(match[1], 10) : 5;
  return minutes * 60 * 1000;
}

/**
 * Format remaining milliseconds into a human-readable string.
 * e.g. "3m 15s", "45s", "now"
 */
export function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'now';
  const totalSeconds = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
