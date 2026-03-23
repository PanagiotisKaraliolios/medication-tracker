import { capitalize } from './string';

describe('capitalize', () => {
  test('capitalises lowercase string', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  test('returns already-capitalised string unchanged', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  test('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  test('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });

  test('only capitalises first character', () => {
    expect(capitalize('hello world')).toBe('Hello world');
  });
});
