import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, type ColorScheme } from './theme';

interface SegmentedControlProps {
  options: string[];
  selected: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, selected, onChange }: SegmentedControlProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.container} accessibilityRole="tablist">
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          style={[styles.option, selected === option && styles.optionSelected]}
          accessibilityRole="tab"
          accessibilityLabel={option}
          accessibilityState={{ selected: selected === option }}
        >
          <Text style={[styles.optionText, selected === option && styles.optionTextSelected]}>
            {option}
          </Text>
        </Pressable>
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
      minHeight: 44,
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
