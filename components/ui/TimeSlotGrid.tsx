import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type ColorScheme, gradients, borderRadius } from './theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { TIME_SLOTS } from '../../constants/schedule';

type Props = {
  selected: string[];
  onToggle: (label: string) => void;
};

export function TimeSlotGrid({ selected, onToggle }: Props) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.grid}>
      {TIME_SLOTS.map((slot) => {
        const isSelected = selected.includes(slot.label);
        return (
          <TouchableOpacity
            key={slot.label}
            style={styles.wrapper}
            activeOpacity={0.7}
            onPress={() => onToggle(slot.label)}
          >
            {isSelected ? (
              <LinearGradient
                colors={[...gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.slot}
              >
                <Feather name={slot.icon} size={24} color={c.white} />
                <Text style={styles.labelSelected}>{slot.label}</Text>
                <Text style={styles.timeSelected}>{slot.time}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.slot, styles.slotUnselected]}>
                <Feather name={slot.icon} size={24} color={c.gray500} />
                <Text style={styles.label}>{slot.label}</Text>
                <Text style={styles.time}>{slot.time}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    wrapper: {
      width: '47%',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.gray200,
    },
    slot: {
      borderRadius: borderRadius.lg,
      padding: 16,
      alignItems: 'center',
      gap: 8,
    },
    slotUnselected: {
      backgroundColor: c.card,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray900,
    },
    labelSelected: {
      fontSize: 14,
      fontWeight: '600',
      color: c.white,
    },
    time: {
      fontSize: 12,
      color: c.gray500,
    },
    timeSelected: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
    },
  });
}
