import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ColorScheme } from './theme';

interface InventoryProgressBarProps {
  current: number;
  threshold: number;
}

export function InventoryProgressBar({ current, threshold }: InventoryProgressBarProps) {
  const isLow = current <= threshold;
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.container}>
      <View style={styles.countRow}>
        <Text style={[styles.countValue, isLow && { color: c.error }]}>{current}</Text>
        <Text style={styles.countLabel}> pills remaining</Text>
      </View>
      {isLow && (
        <View style={styles.warningRow}>
          <Feather name="alert-triangle" size={14} color={c.warning} />
          <Text style={styles.warningText}>Low supply — threshold is {threshold}</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      gap: 6,
    },
    countRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    countValue: {
      fontSize: 20,
      fontWeight: '700',
      color: c.gray900,
    },
    countLabel: {
      fontSize: 14,
      color: c.gray600,
    },
    warningRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    warningText: {
      fontSize: 13,
      color: c.warning,
      fontWeight: '500',
    },
  });
}
