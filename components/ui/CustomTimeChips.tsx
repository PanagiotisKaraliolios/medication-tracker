import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type ColorScheme, gradients, borderRadius } from './theme';
import { useThemeColors } from '../../hooks/useThemeColors';

type Props = {
  times: string[];
  onRemove: (label: string) => void;
};

export function CustomTimeChips({ times, onRemove }: Props) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (times.length === 0) return null;

  return (
    <View style={styles.row}>
      {times.map((t) => (
        <View key={t} style={styles.chip}>
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Feather name="clock" size={14} color={c.white} />
            <Text style={styles.text}>{t}</Text>
            <TouchableOpacity onPress={() => onRemove(t)} hitSlop={8}>
              <Feather name="x" size={14} color={c.white} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderRadius: borderRadius.round,
      overflow: 'hidden',
    },
    gradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingLeft: 12,
      paddingRight: 10,
      borderRadius: borderRadius.round,
    },
    text: {
      fontSize: 13,
      fontWeight: '600',
      color: c.white,
    },
  });
}
