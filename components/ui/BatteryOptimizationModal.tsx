import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from './Button';
import { type ColorScheme, borderRadius, shadows } from './theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface BatteryOptimizationModalProps {
  visible: boolean;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

export function BatteryOptimizationModal({
  visible,
  onOpenSettings,
  onDismiss,
}: BatteryOptimizationModalProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: c.warningLight }]}>
            <Feather name="battery" size={28} color={c.warning} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Unrestricted Background Activity</Text>

          {/* Message */}
          <Text style={styles.message}>
            Battery optimization may delay or prevent your medication reminders.
            To ensure uninterrupted notifications, please allow unrestricted
            background activity for this app.
          </Text>

          {/* Steps */}
          <View style={styles.stepsContainer}>
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Tap <Text style={styles.stepBold}>Allow</Text> on the next screen
              </Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                This lets your reminders arrive on time, even in the background
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <View style={styles.buttonWrapper}>
              <Button variant="ghost" onPress={onDismiss}>
                Not Now
              </Button>
            </View>
            <View style={styles.buttonWrapper}>
              <Button variant="primary" onPress={onOpenSettings}>
                Open Settings
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    dialog: {
      width: '100%',
      backgroundColor: c.card,
      borderRadius: borderRadius.xxl,
      paddingTop: 32,
      paddingBottom: 24,
      paddingHorizontal: 24,
      alignItems: 'center',
      ...shadows.lg,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: c.gray900,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 15,
      color: c.gray500,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 20,
    },
    stepsContainer: {
      width: '100%',
      gap: 12,
      marginBottom: 24,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    stepBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.tealLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    stepBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.teal,
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      color: c.gray600,
      lineHeight: 20,
    },
    stepBold: {
      fontWeight: '700',
      color: c.gray900,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    buttonWrapper: {
      flex: 1,
    },
  });
}
