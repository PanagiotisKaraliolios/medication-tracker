import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { type ColorScheme, borderRadius, shadows } from './theme';
import { useThemeColors } from '../../hooks/useThemeColors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const PICKER_ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = PICKER_ITEM_HEIGHT * VISIBLE_ITEMS;

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (dateISO: string) => void;
  initialDate?: string;   // YYYY-MM-DD
  minDate?: string;        // YYYY-MM-DD
  maxDate?: string;        // YYYY-MM-DD
  title?: string;
};

type PickerStep = 'year' | 'month' | 'day';

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DatePickerModal({ visible, onClose, onConfirm, initialDate, minDate, maxDate, title }: Props) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const today = useMemo(() => toISO(new Date()), []);

  const initial = initialDate ?? today;
  const [selectedDate, setSelectedDate] = useState(initial);
  const [viewYear, setViewYear] = useState(() => parseISO(initial).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseISO(initial).getMonth());
  const [step, setStep] = useState<PickerStep>('day');

  const maxYear = maxDate ? parseInt(maxDate.split('-')[0], 10) : new Date().getFullYear();
  const minYear = minDate ? parseInt(minDate.split('-')[0], 10) : maxYear - 150;
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = maxYear; y >= minYear; y--) arr.push(y);
    return arr;
  }, [minYear, maxYear]);

  const yearListRef = useRef<FlatList<number>>(null);
  const monthListRef = useRef<FlatList<number>>(null);
  const monthIndices = useMemo(() => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], []);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      const d = initialDate ?? today;
      setSelectedDate(d);
      setViewYear(parseISO(d).getFullYear());
      setViewMonth(parseISO(d).getMonth());
      setStep('day');
    }
  }, [visible, initialDate, today]);

  // Scroll to selected year/month when switching to picker steps
  useEffect(() => {
    if (!visible) return;
    if (step === 'year') {
      const idx = years.indexOf(viewYear);
      if (idx >= 0) {
        setTimeout(() => {
          yearListRef.current?.scrollToIndex({ index: Math.max(0, idx - 2), animated: false });
        }, 50);
      }
    } else if (step === 'month') {
      const idx = viewMonth;
      setTimeout(() => {
        monthListRef.current?.scrollToIndex({ index: Math.max(0, idx - 2), animated: false });
      }, 50);
    }
  }, [step, visible, viewYear, viewMonth, years]);

  const goMonth = useCallback((delta: number) => {
    setViewMonth((m) => {
      let newM = m + delta;
      if (newM < 0) {
        setViewYear((y) => y - 1);
        newM = 11;
      } else if (newM > 11) {
        setViewYear((y) => y + 1);
        newM = 0;
      }
      return newM;
    });
  }, []);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [viewYear, viewMonth]);

  const handleDayPress = (day: number) => {
    const iso = toISO(new Date(viewYear, viewMonth, day));
    if (minDate && iso < minDate) return;
    if (maxDate && iso > maxDate) return;
    setSelectedDate(iso);
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

  const handleYearSelect = (year: number) => {
    setViewYear(year);
    setStep('month');
  };

  const handleMonthSelect = (month: number) => {
    setViewMonth(month);
    setStep('day');
  };

  const isMonthDisabled = (month: number) => {
    if (minDate) {
      const [minY, minM] = minDate.split('-').map(Number);
      if (viewYear < minY || (viewYear === minY && month < minM - 1)) return true;
    }
    if (maxDate) {
      const [maxY, maxM] = maxDate.split('-').map(Number);
      if (viewYear > maxY || (viewYear === maxY && month > maxM - 1)) return true;
    }
    return false;
  };

  const renderYearItem = useCallback(({ item: year }: { item: number }) => {
    const isSelected = year === viewYear;
    return (
      <TouchableOpacity
        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
        onPress={() => handleYearSelect(year)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
          {year}
        </Text>
      </TouchableOpacity>
    );
  }, [viewYear, styles]);

  const renderMonthItem = useCallback(({ item: month }: { item: number }) => {
    const isSelected = month === viewMonth;
    const disabled = isMonthDisabled(month);
    return (
      <TouchableOpacity
        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
        onPress={() => handleMonthSelect(month)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text style={[
          styles.pickerItemText,
          isSelected && styles.pickerItemTextSelected,
          disabled && styles.pickerItemTextDisabled,
        ]}>
          {MONTHS[month]}
        </Text>
      </TouchableOpacity>
    );
  }, [viewMonth, viewYear, minDate, maxDate, styles]);

  const renderYearPicker = () => (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerTitle}>Select Year</Text>
      <FlatList
        ref={yearListRef}
        data={years}
        keyExtractor={(item) => String(item)}
        renderItem={renderYearItem}
        style={styles.pickerList}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: PICKER_ITEM_HEIGHT,
          offset: PICKER_ITEM_HEIGHT * index,
          index,
        })}
        onScrollToIndexFailed={() => {}}
      />
    </View>
  );

  const renderMonthPicker = () => (
    <View style={styles.pickerContainer}>
      <TouchableOpacity
        style={styles.pickerBackRow}
        onPress={() => setStep('year')}
        activeOpacity={0.7}
      >
        <Feather name="chevron-left" size={18} color={c.teal} />
        <Text style={styles.pickerBackText}>{viewYear}</Text>
      </TouchableOpacity>
      <Text style={styles.pickerTitle}>Select Month</Text>
      <FlatList
        ref={monthListRef}
        data={monthIndices}
        keyExtractor={(item) => String(item)}
        renderItem={renderMonthItem}
        style={styles.pickerList}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: PICKER_ITEM_HEIGHT,
          offset: PICKER_ITEM_HEIGHT * index,
          index,
        })}
        onScrollToIndexFailed={() => {}}
      />
    </View>
  );

  const renderCalendar = () => (
    <>
      {/* Month navigation — tappable year & month */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => goMonth(-1)} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={c.gray700} />
        </TouchableOpacity>
        <View style={styles.monthLabelRow}>
          <TouchableOpacity onPress={() => setStep('month')} activeOpacity={0.7}>
            <Text style={styles.monthLabelTappable}>{MONTHS[viewMonth]}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep('year')} activeOpacity={0.7}>
            <Text style={styles.yearLabelTappable}>{viewYear}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => goMonth(1)} hitSlop={12}>
          <Feather name="chevron-right" size={24} color={c.gray700} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View style={styles.weekRow}>
        {DAYS.map((d) => (
          <Text key={d} style={styles.weekLabel}>{d[0]}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {calendarDays.map((day, i) => {
          if (day === null) {
            return <View key={`blank-${i}`} style={styles.dayCell} />;
          }
          const iso = toISO(new Date(viewYear, viewMonth, day));
          const isSelected = iso === selectedDate;
          const isToday = iso === today;
          const isDisabled = !!(minDate && iso < minDate) || !!(maxDate && iso > maxDate);

          return (
            <TouchableOpacity
              key={`day-${day}`}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => handleDayPress(day)}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                  isToday && !isSelected && styles.dayTextToday,
                  isDisabled && styles.dayTextDisabled,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          {/* Title */}
          <Text style={styles.title}>{title ?? 'Select Date'}</Text>

          {step === 'year' && renderYearPicker()}
          {step === 'month' && renderMonthPicker()}
          {step === 'day' && renderCalendar()}

          {/* Footer buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            {step === 'day' && (
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const CELL_SIZE = Math.floor((SCREEN_WIDTH - 80) / 7);

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      width: SCREEN_WIDTH - 48,
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      padding: 20,
      ...shadows.lg,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.gray900,
      textAlign: 'center',
      marginBottom: 16,
    },

    /* ── Year / Month picker ── */
    pickerContainer: {
      alignItems: 'center',
    },
    pickerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 12,
    },
    pickerBackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginBottom: 8,
    },
    pickerBackText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.teal,
    },
    pickerList: {
      height: PICKER_HEIGHT,
      width: '100%',
    },
    pickerItem: {
      height: PICKER_ITEM_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: borderRadius.lg,
      marginHorizontal: 16,
    },
    pickerItemSelected: {
      backgroundColor: c.teal + '18',
    },
    pickerItemText: {
      fontSize: 17,
      fontWeight: '500',
      color: c.gray700,
    },
    pickerItemTextSelected: {
      color: c.teal,
      fontWeight: '700',
    },
    pickerItemTextDisabled: {
      color: c.gray300,
    },

    /* ── Calendar day view ── */
    monthNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    monthLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    monthLabelTappable: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
    },
    yearLabelTappable: {
      fontSize: 16,
      fontWeight: '600',
      color: c.teal,
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 8,
    },
    weekLabel: {
      width: CELL_SIZE,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '600',
      color: c.gray400,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    dayCell: {
      width: CELL_SIZE,
      height: CELL_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: CELL_SIZE / 2,
    },
    dayCellSelected: {
      backgroundColor: c.teal,
    },
    dayCellToday: {
      borderWidth: 1.5,
      borderColor: c.teal,
    },
    dayText: {
      fontSize: 15,
      color: c.gray900,
    },
    dayTextSelected: {
      color: c.white,
      fontWeight: '700',
    },
    dayTextToday: {
      color: c.teal,
      fontWeight: '600',
    },
    dayTextDisabled: {
      color: c.gray300,
    },

    /* ── Footer ── */
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 16,
    },
    cancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: borderRadius.sm,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray500,
    },
    confirmBtn: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: borderRadius.sm,
      backgroundColor: c.teal,
    },
    confirmText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.white,
    },
  });
}
