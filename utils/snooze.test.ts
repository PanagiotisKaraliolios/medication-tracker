import { formatTimeLeft, parseSnoozeDuration } from './snooze';

describe('parseSnoozeDuration', () => {
  test('parses "5 min" to 300000ms', () => {
    expect(parseSnoozeDuration('5 min')).toBe(300_000);
  });

  test('parses "10 min" to 600000ms', () => {
    expect(parseSnoozeDuration('10 min')).toBe(600_000);
  });

  test('parses "30 min" to 1800000ms', () => {
    expect(parseSnoozeDuration('30 min')).toBe(1_800_000);
  });

  test('parses "30s" to 30000ms', () => {
    expect(parseSnoozeDuration('30s')).toBe(30_000);
  });

  test('parses "1 min" to 60000ms', () => {
    expect(parseSnoozeDuration('1 min')).toBe(60_000);
  });

  test('defaults to 30s for invalid seconds format', () => {
    expect(parseSnoozeDuration('abcs')).toBe(30_000);
  });

  test('defaults to 5 min for unrecognised format', () => {
    expect(parseSnoozeDuration('unknown')).toBe(300_000);
  });
});

describe('formatTimeLeft', () => {
  test('returns "now" for 0ms', () => {
    expect(formatTimeLeft(0)).toBe('now');
  });

  test('returns "now" for negative value', () => {
    expect(formatTimeLeft(-1000)).toBe('now');
  });

  test('formats seconds only', () => {
    expect(formatTimeLeft(45_000)).toBe('45s');
  });

  test('formats minutes and seconds', () => {
    expect(formatTimeLeft(195_000)).toBe('3m 15s');
  });

  test('formats exact minute', () => {
    expect(formatTimeLeft(60_000)).toBe('1m 0s');
  });
});
