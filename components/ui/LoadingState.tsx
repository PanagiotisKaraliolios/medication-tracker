import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { type ColorScheme } from './theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={c.teal} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 80,
      paddingHorizontal: 24,
    },
    spinner: {
      marginBottom: 16,
    },
    message: {
      fontSize: 16,
      fontWeight: '500',
      color: c.gray600,
    },
  });
}
