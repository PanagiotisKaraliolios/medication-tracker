import React, { ReactNode, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from './Button';
import { type ColorScheme } from './theme';
import { useThemeColors } from '../../hooks/useThemeColors';

type EmptyVariant = 'medications' | 'reports' | 'schedule' | 'search' | 'inventory';

interface EmptyStateProps {
  title?: string;
  message?: string;
  variant?: EmptyVariant;
  actionLabel?: string;
  onAction?: () => void;
}

const defaults: Record<EmptyVariant, { icon: keyof typeof Feather.glyphMap; title: string; message: string }> = {
  medications: {
    icon: 'package',
    title: 'No medications yet',
    message: 'Start adding your medications to track your doses and stay on schedule.',
  },
  reports: {
    icon: 'file-text',
    title: 'No reports available',
    message: 'Track your medications for a few days to generate your first adherence report.',
  },
  schedule: {
    icon: 'calendar',
    title: 'No scheduled doses',
    message: "You're all caught up! No upcoming medications at this time.",
  },
  search: {
    icon: 'search',
    title: 'No results found',
    message: 'Try adjusting your search terms or check your spelling.',
  },
  inventory: {
    icon: 'box',
    title: 'Inventory is empty',
    message: 'Add medication quantities to track your supply and get refill reminders.',
  },
};

export function EmptyState({
  title,
  message,
  variant = 'medications',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const d = defaults[variant];
  const displayTitle = title || d.title;
  const displayMessage = message || d.message;
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name={d.icon} size={48} color={c.gray400} />
      </View>
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {actionLabel && onAction && (
        <View style={styles.buttonWrapper}>
          <Button variant="primary" onPress={onAction}>
            {actionLabel}
          </Button>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 64,
      paddingHorizontal: 24,
    },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: c.gray100,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: c.gray900,
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 15,
      color: c.gray600,
      textAlign: 'center',
      marginBottom: 24,
      maxWidth: 300,
      lineHeight: 22,
    },
    buttonWrapper: {
      width: 200,
    },
  });
}
