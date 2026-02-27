import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
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

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (dateISO: string) => void;
  initialDate?: string;   // YYYY-MM-DD
  minDate?: string;        // YYYY-MM-DD
  title?: string;
};

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

export function DatePickerModal({ visible, onClose, onConfirm, initialDate, minDate, title }: Props) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const today = useMemo(() => {
    const d = new Date();
    return toISO(d);
  }, []);

  const initial = initialDate ?? today;
  const [selectedDate, setSelectedDate] = useState(initial);
  const [viewYear, setViewYear] = useState(() => parseISO(initial).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseISO(initial).getMonth());

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      const d = initialDate ?? today;
      setSelectedDate(d);
      setViewYear(parseISO(d).getFullYear());
      setViewMonth(parseISO(d).getMonth());
    }
  }, [visible, initialDate, today]);

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
    // leading blanks
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // trailing blanks to fill last row
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [viewYear, viewMonth]);

  const handleDayPress = (day: number) => {
    const iso = toISO(new Date(viewYear, viewMonth, day));
    if (minDate && iso < minDate) return;
    setSelectedDate(iso);
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

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

          {/* Month navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => goMonth(-1)} hitSlop={12}>
              <Feather name="chevron-left" size={24} color={c.gray700} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
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
              const isDisabled = !!(minDate && iso < minDate);

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

          {/* Footer buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
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
    monthNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    monthLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
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
