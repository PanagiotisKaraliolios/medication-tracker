import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DatePickerModal } from './DatePickerModal';
import { type ColorScheme, borderRadius, shadows } from './theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatDateLabel } from '../../utils/date';

type Props = {
  startDate: string;
  endDate: string | null;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string | null) => void;
};

export function DateRangeSection({ startDate, endDate, onStartDateChange, onEndDateChange }: Props) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  return (
    <>
      {/* Start Date */}
      <TouchableOpacity
        style={styles.dateRow}
        activeOpacity={0.7}
        onPress={() => setShowStartPicker(true)}
      >
        <View style={styles.dateLeft}>
          <View style={[styles.dateIcon, { backgroundColor: c.tealLight }]}>
            <Feather name="play" size={16} color={c.teal} />
          </View>
          <View>
            <Text style={styles.dateLabel}>Start Date</Text>
            <Text style={styles.dateValue}>{formatDateLabel(startDate)}</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={c.gray400} />
      </TouchableOpacity>

      {/* End Date Toggle + Picker */}
      <View style={styles.endDateCard}>
        <View style={styles.endDateToggle}>
          <View style={styles.dateLeft}>
            <View style={[styles.dateIcon, { backgroundColor: c.blueLight }]}>
              <Feather name="square" size={16} color={c.blue} />
            </View>
            <View>
              <Text style={styles.dateLabel}>Continue Forever</Text>
              <Text style={styles.dateHint}>No end date</Text>
            </View>
          </View>
          <Switch
            value={endDate === null}
            onValueChange={(val) => onEndDateChange(val ? null : startDate)}
            trackColor={{ false: c.gray200, true: c.teal }}
            thumbColor={c.white}
          />
        </View>

        {endDate !== null && (
          <TouchableOpacity
            style={[styles.dateRow, { marginTop: 12 }]}
            activeOpacity={0.7}
            onPress={() => setShowEndPicker(true)}
          >
            <View style={styles.dateLeft}>
              <View style={[styles.dateIcon, { backgroundColor: c.errorLight }]}>
                <Feather name="flag" size={16} color={c.error} />
              </View>
              <View>
                <Text style={styles.dateLabel}>End Date</Text>
                <Text style={styles.dateValue}>{formatDateLabel(endDate)}</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={c.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Date picker modals */}
      <DatePickerModal
        visible={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        onConfirm={(date) => {
          onStartDateChange(date);
          if (endDate && date > endDate) onEndDateChange(date);
        }}
        initialDate={startDate}
        title="Start Date"
      />
      <DatePickerModal
        visible={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        onConfirm={(date) => onEndDateChange(date)}
        initialDate={endDate ?? startDate}
        minDate={startDate}
        title="End Date"
      />
    </>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    dateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 14,
      ...shadows.sm,
    },
    dateLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dateIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray900,
    },
    dateValue: {
      fontSize: 13,
      color: c.gray500,
      marginTop: 2,
    },
    dateHint: {
      fontSize: 12,
      color: c.gray400,
      marginTop: 2,
    },
    endDateCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 14,
      ...shadows.sm,
    },
    endDateToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });
}
