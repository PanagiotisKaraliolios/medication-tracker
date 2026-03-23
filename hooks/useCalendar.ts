import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated as RNAnimated } from 'react-native';
import { DAY_LABELS } from '../constants/days';
import { toISO } from '../utils/date';

export function useCalendar() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const calendarAnim = useRef(new RNAnimated.Value(0)).current;

  const today = new Date();
  const todayISO = toISO(today);
  const selectedISO = toISO(selectedDate);
  const selectedDayLabel = DAY_LABELS[selectedDate.getDay()];
  const isToday = selectedISO === todayISO;

  const dateStr = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // ── Animation helpers ──

  const toggleCalendar = useCallback(() => {
    const toValue = calendarExpanded ? 0 : 1;
    setCalendarExpanded(!calendarExpanded);
    RNAnimated.timing(calendarAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [calendarExpanded, calendarAnim]);

  const calendarHeight = calendarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 340],
  });

  const calendarOpacity = calendarAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  const chevronRotation = calendarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // ── Week strip ──

  const weekDays = useMemo(() => {
    const days: { date: Date; iso: string; label: string; dayNum: number }[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push({
        date: d,
        iso: toISO(d),
        label: DAY_LABELS[d.getDay()],
        dayNum: d.getDate(),
      });
    }
    return days;
  }, [today]);

  // ── Month calendar grid ──

  const calendarViewMonth = selectedDate.getMonth();
  const calendarViewYear = selectedDate.getFullYear();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarViewYear, calendarViewMonth, 1).getDay();
    const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarViewYear, calendarViewMonth]);

  // ── Navigation ──

  const goMonth = useCallback(
    (delta: number) => {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() + delta);
      newDate.setDate(1);
      setSelectedDate(newDate);
    },
    [selectedDate],
  );

  const handleDaySelect = useCallback(
    (day: number) => {
      const d = new Date(calendarViewYear, calendarViewMonth, day);
      setSelectedDate(d);
    },
    [calendarViewYear, calendarViewMonth],
  );

  const handleWeekDaySelect = useCallback((iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    setSelectedDate(new Date(y, m - 1, d));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  return {
    selectedDate,
    selectedISO,
    selectedDayLabel,
    todayISO,
    isToday,
    dateStr,
    calendarExpanded,
    calendarHeight,
    calendarOpacity,
    chevronRotation,
    toggleCalendar,
    weekDays,
    calendarViewMonth,
    calendarViewYear,
    calendarDays,
    goMonth,
    handleDaySelect,
    handleWeekDaySelect,
    goToToday,
  };
}
