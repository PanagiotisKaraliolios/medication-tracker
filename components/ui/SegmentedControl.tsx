import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type ColorScheme, borderRadius } from './theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SegmentedControlProps {
  options: string[];
  selected: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, selected, onChange }: SegmentedControlProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          onPress={() => onChange(option)}
          style={[
            styles.option,
            selected === option && styles.optionSelected,
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.optionText,
              selected === option && styles.optionTextSelected,
            ]}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.gray100,
      borderRadius: borderRadius.lg,
      padding: 4,
      flexDirection: 'row',
      gap: 4,
    },
    option: {
      flex: 1,
      height: 40,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionSelected: {
      backgroundColor: c.gray200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    optionText: {
      fontSize: 14,
      fontWeight: '500',
      color: c.gray600,
    },
    optionTextSelected: {
      color: c.gray800,
      fontWeight: '600',
    },
  });
}
