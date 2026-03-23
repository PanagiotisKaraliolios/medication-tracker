import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, type ColorScheme, gradients } from './theme';

interface DaySelectorProps {
  days: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const DaySelector = React.memo(function DaySelector({
  days,
  selected,
  onChange,
}: DaySelectorProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const toggleDay = useCallback(
    (day: string) => {
      if (selected.includes(day)) {
        onChange(selected.filter((d) => d !== day));
      } else {
        onChange([...selected, day]);
      }
    },
    [selected, onChange],
  );

  return (
    <View style={styles.container}>
      {days.map((day) => {
        const isSelected = selected.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => toggleDay(day)}
            style={styles.dayWrapper}
            accessibilityRole="checkbox"
            accessibilityLabel={day}
            accessibilityState={{ checked: isSelected }}
          >
            {isSelected ? (
              <LinearGradient
                colors={[...gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.day}
              >
                <Text style={styles.dayTextSelected}>{day}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.day, styles.dayUnselected]}>
                <Text style={styles.dayText}>{day}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
});

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: 6,
    },
    dayWrapper: {
      flex: 1,
    },
    day: {
      height: 48,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayUnselected: {
      backgroundColor: c.gray100,
    },
    dayText: {
      fontSize: 13,
      fontWeight: '500',
      color: c.gray600,
    },
    dayTextSelected: {
      fontSize: 13,
      fontWeight: '600',
      color: c.white,
    },
  });
}
