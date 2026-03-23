import {
  formatDateLabel,
  formatHourMinute,
  getRelativeTime,
  parseTimeToMinutes,
  toISO,
} from './date';

describe('toISO', () => {
  test('formats standard date', () => {
    expect(toISO(new Date(2025, 0, 15))).toBe('2025-01-15');
  });

  test('pads single-digit month and day', () => {
    expect(toISO(new Date(2025, 2, 5))).toBe('2025-03-05');
  });

  test('handles Dec 31', () => {
    expect(toISO(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  test('handles leap day', () => {
    expect(toISO(new Date(2024, 1, 29))).toBe('2024-02-29');
  });
});

describe('formatDateLabel', () => {
  test('formats ISO date to human-readable label', () => {
    expect(formatDateLabel('2025-01-15')).toBe('Jan 15, 2025');
  });

  test('handles December', () => {
    expect(formatDateLabel('2025-12-25')).toBe('Dec 25, 2025');
  });
});

describe('formatHourMinute', () => {
  test('formats midnight', () => {
    expect(formatHourMinute(0, 0)).toBe('12:00 AM');
  });

  test('formats noon', () => {
    expect(formatHourMinute(12, 0)).toBe('12:00 PM');
  });

  test('formats AM hour', () => {
    expect(formatHourMinute(8, 30)).toBe('8:30 AM');
  });

  test('formats PM hour', () => {
    expect(formatHourMinute(13, 45)).toBe('1:45 PM');
  });

  test('formats 23:59', () => {
    expect(formatHourMinute(23, 59)).toBe('11:59 PM');
  });
});

describe('parseTimeToMinutes', () => {
  test('parses morning time', () => {
    expect(parseTimeToMinutes('8:00 AM')).toBe(480);
  });

  test('parses afternoon time', () => {
    expect(parseTimeToMinutes('2:30 PM')).toBe(870);
  });

  test('parses 12:00 AM as midnight (0)', () => {
    expect(parseTimeToMinutes('12:00 AM')).toBe(0);
  });

  test('parses 12:00 PM as noon (720)', () => {
    expect(parseTimeToMinutes('12:00 PM')).toBe(720);
  });

  test('returns -1 for invalid input', () => {
    expect(parseTimeToMinutes('invalid')).toBe(-1);
  });

  test('returns -1 for empty string', () => {
    expect(parseTimeToMinutes('')).toBe(-1);
  });
});

describe('getRelativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns "Just now" for < 60 seconds ago', () => {
    expect(getRelativeTime(Date.now() - 30_000)).toBe('Just now');
  });

  test('returns minutes ago', () => {
    expect(getRelativeTime(Date.now() - 5 * 60_000)).toBe('5m ago');
  });

  test('returns hours ago', () => {
    expect(getRelativeTime(Date.now() - 3 * 3600_000)).toBe('3h ago');
  });

  test('returns date for > 24 hours ago', () => {
    const result = getRelativeTime(Date.now() - 2 * 86_400_000);
    // Should be a date string like "Jun 13"
    expect(result).toMatch(/\w{3}\s+\d{1,2}/);
  });
});
