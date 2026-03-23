import { Feather } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
import { Pressable, Animated as RNAnimated, StyleSheet, Text, View } from 'react-native';
import { DAY_LABELS, MONTHS } from '../../constants/days';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { DayStatus } from '../../utils/calendar';
import { borderRadius, type ColorScheme, shadows } from './theme';

interface CalendarSectionProps {
  selectedISO: string;
  todayISO: string;
  isToday: boolean;
  weekDays: { date: Date; iso: string; label: string; dayNum: number }[];
  calendarExpanded: boolean;
  calendarHeight: RNAnimated.AnimatedInterpolation<string | number>;
  calendarOpacity: RNAnimated.AnimatedInterpolation<string | number>;
  chevronRotation: RNAnimated.AnimatedInterpolation<string | number>;
  calendarViewMonth: number;
  calendarViewYear: number;
  calendarDays: (number | null)[];
  dayStatusMap: Record<string, DayStatus>;
  toggleCalendar: () => void;
  goMonth: (delta: number) => void;
  handleDaySelect: (day: number) => void;
  handleWeekDaySelect: (iso: string) => void;
  goToToday: () => void;
}

export const CalendarSection = React.memo(function CalendarSection({
  selectedISO,
  todayISO,
  isToday,
  weekDays,
  calendarExpanded,
  calendarHeight,
  calendarOpacity,
  chevronRotation,
  calendarViewMonth,
  calendarViewYear,
  calendarDays,
  dayStatusMap,
  toggleCalendar,
  goMonth,
  handleDaySelect,
  handleWeekDaySelect,
  goToToday,
}: CalendarSectionProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const statusDotColor = useCallback(
    (status: DayStatus | undefined, isSelected: boolean): string | null => {
      if (!status || status === 'empty') return null;
      if (status === 'all') return isSelected ? '#FFFFFF' : '#22C55E';
      if (status === 'partial') return isSelected ? '#FFFFFF' : '#F59E0B';
      return isSelected ? 'rgba(255,255,255,0.5)' : c.gray400;
    },
    [c.gray400],
  );

  return (
    <View style={styles.calendarSection}>
      {/* Week strip */}
      <View style={styles.weekStrip}>
        {weekDays.map((wd) => {
          const isSel = wd.iso === selectedISO;
          const isWdToday = wd.iso === todayISO;
          const dotColor = statusDotColor(dayStatusMap[wd.iso], isSel);
          return (
            <Pressable
              key={wd.iso}
              style={[
                styles.weekDay,
                isSel && styles.weekDaySelected,
                isWdToday && !isSel && styles.weekDayToday,
              ]}
              onPress={() => handleWeekDaySelect(wd.iso)}
              accessibilityRole="button"
              accessibilityLabel={`${wd.label} ${wd.dayNum}${isSel ? ', selected' : ''}${isWdToday ? ', today' : ''}`}
              accessibilityState={{ selected: isSel }}
            >
              <Text style={[styles.weekDayLabel, isSel && styles.weekDayLabelSelected]}>
                {wd.label}
              </Text>
              <Text
                style={[
                  styles.weekDayNum,
                  isSel && styles.weekDayNumSelected,
                  isWdToday && !isSel && styles.weekDayNumToday,
                ]}
              >
                {wd.dayNum}
              </Text>
              {dotColor ? (
                <View
                  style={[styles.statusDot, { backgroundColor: dotColor }]}
                  accessible={false}
                />
              ) : (
                <View style={styles.statusDotSpacer} accessible={false} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Expand/Collapse toggle + go-to-today */}
      <View style={styles.calendarToggle}>
        {!isToday ? (
          <Pressable
            style={styles.goTodayButton}
            onPress={goToToday}
            accessibilityRole="button"
            accessibilityLabel="Go to today"
          >
            <Feather name="corner-up-left" size={14} color={c.teal} />
            <Text style={styles.goTodayText}>Today</Text>
          </Pressable>
        ) : (
          <View style={styles.goTodayPlaceholder} />
        )}
        <Pressable
          style={styles.calendarToggleInner}
          onPress={toggleCalendar}
          accessibilityRole="button"
          accessibilityLabel={calendarExpanded ? 'Hide calendar' : 'Show calendar'}
        >
          <Text style={styles.calendarToggleText}>
            {calendarExpanded ? 'Hide Calendar' : 'Show Calendar'}
          </Text>
          <RNAnimated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <Feather name="chevron-down" size={18} color={c.gray500} />
          </RNAnimated.View>
        </Pressable>
        <View style={styles.goTodayPlaceholder} />
      </View>

      {/* Expandable full calendar */}
      <RNAnimated.View
        style={[styles.calendarExpanded, { height: calendarHeight, opacity: calendarOpacity }]}
      >
        {/* Month nav */}
        <View style={styles.calMonthNav}>
          <Pressable
            onPress={() => goMonth(-1)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={styles.monthChevron}
          >
            <Feather name="chevron-left" size={22} color={c.gray700} />
          </Pressable>
          <Text style={styles.calMonthLabel}>
            {MONTHS[calendarViewMonth]} {calendarViewYear}
          </Text>
          <Pressable
            onPress={() => goMonth(1)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={styles.monthChevron}
          >
            <Feather name="chevron-right" size={22} color={c.gray700} />
          </Pressable>
        </View>

        {/* Day-of-week headers */}
        <View style={styles.calWeekHeaders}>
          {DAY_LABELS.map((d) => (
            <Text key={d} style={styles.calWeekHeaderText}>
              {d[0]}
            </Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calGrid}>
          {calendarDays.map((day, i) => {
            if (day === null) {
              // biome-ignore lint/suspicious/noArrayIndexKey: blank calendar cells have no data identity; position is stable
              return <View key={`blank-${i}`} style={styles.calDayCell} />;
            }
            const iso = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSel = iso === selectedISO;
            const isTodayCell = iso === todayISO;
            const dotColor = statusDotColor(dayStatusMap[iso], isSel);

            return (
              <Pressable
                key={`day-${day}`}
                style={[
                  styles.calDayCell,
                  isSel && styles.calDayCellSelected,
                  isTodayCell && !isSel && styles.calDayCellToday,
                ]}
                onPress={() => handleDaySelect(day)}
                accessibilityRole="button"
                accessibilityLabel={`${day}${isSel ? ', selected' : ''}${isTodayCell ? ', today' : ''}`}
                accessibilityState={{ selected: isSel }}
              >
                <Text
                  style={[
                    styles.calDayText,
                    isSel && styles.calDayTextSelected,
                    isTodayCell && !isSel && styles.calDayTextToday,
                  ]}
                >
                  {day}
                </Text>
                {dotColor ? (
                  <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </RNAnimated.View>
    </View>
  );
});

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    calendarSection: {
      backgroundColor: c.card,
      marginHorizontal: 24,
      marginTop: 16,
      borderRadius: borderRadius.lg,
      ...shadows.sm,
      overflow: 'hidden' as const,
    },
    weekStrip: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    weekDay: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
    },
    weekDaySelected: {
      backgroundColor: '#1FA2A6',
    },
    weekDayToday: {
      borderWidth: 1.5,
      borderColor: '#1FA2A6',
    },
    weekDayLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: c.gray500,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    weekDayLabelSelected: {
      color: '#FFFFFF',
    },
    weekDayNum: {
      fontSize: 16,
      fontWeight: '700',
      color: c.gray900,
    },
    weekDayNumSelected: {
      color: '#FFFFFF',
    },
    weekDayNumToday: {
      color: '#1FA2A6',
    },
    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      marginTop: 3,
    },
    statusDotSpacer: {
      height: 5,
      marginTop: 3,
    },
    calendarToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.gray200,
    },
    calendarToggleInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 2,
    },
    calendarToggleText: {
      fontSize: 13,
      fontWeight: '500',
      color: c.gray500,
    },
    goTodayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: borderRadius.round,
      backgroundColor: c.background,
    },
    goTodayText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.teal,
    },
    goTodayPlaceholder: {
      width: 70,
    },
    calendarExpanded: {
      overflow: 'hidden',
    },
    calMonthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    monthChevron: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calMonthLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: c.gray900,
    },
    calWeekHeaders: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 8,
      paddingBottom: 4,
    },
    calWeekHeaderText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.gray500,
      width: 36,
      textAlign: 'center',
    },
    calGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    calDayCell: {
      width: '14.28%' as unknown as number,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    calDayCellSelected: {
      backgroundColor: '#1FA2A6',
      borderRadius: borderRadius.round,
    },
    calDayCellToday: {
      borderWidth: 1.5,
      borderColor: '#1FA2A6',
      borderRadius: borderRadius.round,
    },
    calDayText: {
      fontSize: 14,
      fontWeight: '500',
      color: c.gray900,
    },
    calDayTextSelected: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    calDayTextToday: {
      color: '#1FA2A6',
      fontWeight: '700',
    },
  });
}
