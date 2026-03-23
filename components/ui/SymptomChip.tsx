import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { ColorScheme } from './theme';
import { borderRadius } from './theme';

type Props = {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  colors: ColorScheme;
};

export function SymptomChip({ name, severity, colors: c }: Props) {
  const bg = severity === 'severe' ? c.errorLight : c.warningLight;
  const fg = severity === 'severe' ? c.error : c.warning;
  const icon =
    severity === 'severe'
      ? 'alert-octagon'
      : severity === 'moderate'
        ? 'alert-triangle'
        : 'alert-circle';

  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Feather name={icon} size={12} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
