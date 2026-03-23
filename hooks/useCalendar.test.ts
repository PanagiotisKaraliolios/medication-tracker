import { act, renderHook } from '@testing-library/react-native';
import { useCalendar } from './useCalendar';

// Pin date to June 15, 2025 (Sunday)
// Only fake Date, keep setTimeout/setInterval real for Animated and waitFor
beforeEach(() => {
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
    ],
  });
  jest.setSystemTime(new Date(2025, 5, 15));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useCalendar', () => {
  // ── Initial state ──

  it('selectedISO matches todayISO initially', () => {
    const { result } = renderHook(() => useCalendar());
    expect(result.current.selectedISO).toBe('2025-06-15');
    expect(result.current.todayISO).toBe('2025-06-15');
    expect(result.current.selectedISO).toBe(result.current.todayISO);
  });

  it('isToday is true initially', () => {
    const { result } = renderHook(() => useCalendar());
    expect(result.current.isToday).toBe(true);
  });

  it('calendarExpanded is false initially', () => {
    const { result } = renderHook(() => useCalendar());
    expect(result.current.calendarExpanded).toBe(false);
  });

  it('selectedDayLabel returns correct day abbreviation', () => {
    const { result } = renderHook(() => useCalendar());
    // June 15, 2025 is a Sunday
    expect(result.current.selectedDayLabel).toBe('Sun');
  });

  it('dateStr contains month and day', () => {
    const { result } = renderHook(() => useCalendar());
    expect(result.current.dateStr).toContain('June');
    expect(result.current.dateStr).toContain('15');
  });

  // ── Week strip ──

  it('weekDays returns 7 entries', () => {
    const { result } = renderHook(() => useCalendar());
    expect(result.current.weekDays).toHaveLength(7);
  });

  it('weekDays center entry is today', () => {
    const { result } = renderHook(() => useCalendar());
    const center = result.current.weekDays[3];
    expect(center.iso).toBe('2025-06-15');
    expect(center.label).toBe('Sun');
    expect(center.dayNum).toBe(15);
  });

  // ── Calendar days grid ──

  it('calendarDays for June 2025 has correct structure', () => {
    const { result } = renderHook(() => useCalendar());
    const days = result.current.calendarDays;

    // June 2025 starts on Sunday → 0 leading nulls
    expect(days[0]).toBe(1);

    // June has 30 days
    const nonNullDays = days.filter((d) => d !== null);
    expect(nonNullDays).toHaveLength(30);
    expect(nonNullDays[nonNullDays.length - 1]).toBe(30);

    // Length must be divisible by 7
    expect(days.length % 7).toBe(0);
  });

  // ── Navigation: goMonth ──

  it('goMonth(1) changes to July with day set to 1', () => {
    const { result } = renderHook(() => useCalendar());
    act(() => {
      result.current.goMonth(1);
    });
    expect(result.current.selectedISO).toBe('2025-07-01');
    expect(result.current.calendarViewMonth).toBe(6); // July = 6
    expect(result.current.calendarViewYear).toBe(2025);
  });

  it('goMonth(-1) changes to May with day set to 1', () => {
    const { result } = renderHook(() => useCalendar());
    act(() => {
      result.current.goMonth(-1);
    });
    expect(result.current.selectedISO).toBe('2025-05-01');
    expect(result.current.calendarViewMonth).toBe(4); // May = 4
  });

  // ── Day selection ──

  it('handleDaySelect updates selectedDate', () => {
    const { result } = renderHook(() => useCalendar());
    act(() => {
      result.current.handleDaySelect(20);
    });
    expect(result.current.selectedISO).toBe('2025-06-20');
  });

  it('handleWeekDaySelect updates selectedDate', () => {
    const { result } = renderHook(() => useCalendar());
    act(() => {
      result.current.handleWeekDaySelect('2025-06-12');
    });
    expect(result.current.selectedISO).toBe('2025-06-12');
  });

  // ── isToday after navigation ──

  it('isToday becomes false after navigating away', () => {
    const { result } = renderHook(() => useCalendar());
    expect(result.current.isToday).toBe(true);

    act(() => {
      result.current.handleDaySelect(10);
    });
    expect(result.current.isToday).toBe(false);
  });

  // ── goToToday ──

  it('goToToday resets selection to today', () => {
    const { result } = renderHook(() => useCalendar());

    act(() => {
      result.current.handleDaySelect(1);
    });
    expect(result.current.isToday).toBe(false);

    act(() => {
      result.current.goToToday();
    });
    expect(result.current.isToday).toBe(true);
    expect(result.current.selectedISO).toBe('2025-06-15');
  });

  // ── selectedDayLabel after change ──

  it('selectedDayLabel updates after selecting a different day', () => {
    const { result } = renderHook(() => useCalendar());
    // Select June 16, 2025 (Monday)
    act(() => {
      result.current.handleDaySelect(16);
    });
    expect(result.current.selectedDayLabel).toBe('Mon');
  });

  // ── toggleCalendar ──

  it('toggleCalendar expands calendar (else branch: toValue=1)', () => {
    const { result } = renderHook(() => useCalendar());
    expect(result.current.calendarExpanded).toBe(false);

    act(() => {
      result.current.toggleCalendar();
    });
    expect(result.current.calendarExpanded).toBe(true);
  });

  it('toggleCalendar collapses calendar (if branch: toValue=0)', () => {
    const { result } = renderHook(() => useCalendar());

    // First expand
    act(() => {
      result.current.toggleCalendar();
    });
    expect(result.current.calendarExpanded).toBe(true);

    // Then collapse — covers the if branch (calendarExpanded ? 0 : 1)
    act(() => {
      result.current.toggleCalendar();
    });
    expect(result.current.calendarExpanded).toBe(false);
  });
});
