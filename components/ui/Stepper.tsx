import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, type ColorScheme, shadows } from './theme';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** If provided, shown after the number (e.g. "pills"). Pluralized when value ≠ 1. */
  suffix?: { singular: string; plural: string };
};

export function Stepper({ value, onChange, min = 1, max, suffix }: Props) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const displayText = suffix
    ? `${value} ${value === 1 ? suffix.singular : suffix.plural}`
    : `${value}`;

  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => onChange(Math.max(min, value - 1))}
        activeOpacity={0.7}
      >
        <Feather name="minus" size={20} color={c.gray600} />
      </TouchableOpacity>
      <Text style={styles.value}>{displayText}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        activeOpacity={0.7}
      >
        <Feather name="plus" size={20} color={c.gray600} />
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      gap: 24,
      ...shadows.sm,
    },
    button: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: {
      fontSize: 20,
      fontWeight: '600',
      color: c.gray900,
      minWidth: 80,
      textAlign: 'center',
    },
  });
}
