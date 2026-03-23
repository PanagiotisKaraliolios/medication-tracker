import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, type ColorScheme, gradients, shadows } from './theme';

type MedicationStatus = 'pending' | 'taken' | 'skipped' | 'snoozed';

interface MedicationCardProps {
  name: string;
  strength: string;
  time: string;
  doseAmount?: string;
  status?: MedicationStatus;
  snoozeTimeLeft?: string;
  onTake?: () => void;
  onSkip?: () => void;
  onSnooze?: () => void;
  onUndo?: () => void;
  onCancelSnooze?: () => void;
}

function getStatusConfig(
  c: ColorScheme,
): Record<MedicationStatus, { bg: string; text: string; label: string }> {
  return {
    pending: { bg: c.warningLight, text: c.warning, label: 'Pending' },
    taken: { bg: c.successLight, text: c.success, label: 'Taken' },
    skipped: { bg: c.gray100, text: c.gray600, label: 'Skipped' },
    snoozed: { bg: c.blueLight, text: c.blue, label: 'Snoozed' },
  };
}

export const MedicationCard = React.memo(function MedicationCard({
  name,
  strength,
  time,
  doseAmount,
  status = 'pending',
  snoozeTimeLeft,
  onTake,
  onSkip,
  onSnooze,
  onUndo,
  onCancelSnooze,
}: MedicationCardProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const config = getStatusConfig(c)[status];

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`${name}, ${strength}, ${time}, ${config.label}`}
    >
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.strength}>
            {strength}
            {doseAmount ? ` · ${doseAmount}` : ''}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
          <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <Feather name="clock" size={16} color={c.gray500} />
        <Text style={styles.timeText}>{time}</Text>
        {status === 'snoozed' && snoozeTimeLeft && (
          <View style={styles.snoozeChip}>
            <Feather name="bell-off" size={12} color={c.blue} />
            <Text style={styles.snoozeChipText}>{snoozeTimeLeft}</Text>
          </View>
        )}
      </View>

      {status === 'pending' && (
        <View style={styles.actions}>
          <Pressable
            style={styles.takeButton}
            onPress={onTake}
            accessibilityRole="button"
            accessibilityLabel={`Take ${name}`}
          >
            <LinearGradient
              colors={[...gradients.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.takeGradient}
            >
              <Feather name="check" size={18} color={c.white} />
              <Text style={styles.takeText}>Take</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel={`Skip ${name}`}
          >
            <Feather name="x" size={18} color={c.gray600} />
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={onSnooze}
            accessibilityRole="button"
            accessibilityLabel={`Snooze ${name}`}
          >
            <Feather name="bell" size={18} color={c.gray600} />
          </Pressable>
        </View>
      )}

      {status === 'snoozed' && (
        <View style={styles.actions}>
          <Pressable
            style={styles.takeButton}
            onPress={onTake}
            accessibilityRole="button"
            accessibilityLabel={`Take ${name} now`}
          >
            <LinearGradient
              colors={[...gradients.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.takeGradient}
            >
              <Feather name="check" size={18} color={c.white} />
              <Text style={styles.takeText}>Take Now</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={onCancelSnooze}
            accessibilityRole="button"
            accessibilityLabel={`Cancel snooze for ${name}`}
          >
            <Feather name="bell-off" size={18} color={c.gray600} />
          </Pressable>
        </View>
      )}

      {(status === 'taken' || status === 'skipped') && onUndo && (
        <View style={styles.actions}>
          <Pressable
            style={styles.undoButton}
            onPress={onUndo}
            accessibilityRole="button"
            accessibilityLabel={`Undo ${status} for ${name}`}
          >
            <Feather name="rotate-ccw" size={16} color={c.gray600} />
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      padding: 20,
      ...shadows.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    info: { flex: 1 },
    name: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 2,
    },
    strength: {
      fontSize: 14,
      color: c.gray500,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: borderRadius.round,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 16,
    },
    timeText: {
      fontSize: 14,
      color: c.gray500,
    },
    snoozeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: borderRadius.round,
      backgroundColor: c.blueLight,
    },
    snoozeChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.blue,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
    },
    takeButton: {
      flex: 1,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    takeGradient: {
      height: 48,
      borderRadius: borderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    takeText: {
      color: c.white,
      fontSize: 15,
      fontWeight: '600',
    },
    iconButton: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      backgroundColor: c.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    undoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 40,
      paddingHorizontal: 16,
      borderRadius: borderRadius.md,
      backgroundColor: c.gray100,
    },
    undoText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray600,
    },
  });
}
