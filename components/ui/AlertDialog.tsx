import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Button } from './Button';
import { borderRadius, type ColorScheme, shadows } from './theme';

type AlertVariant = 'destructive' | 'info' | 'warning' | 'success';

interface AlertDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: AlertVariant;
  icon?: keyof typeof Feather.glyphMap;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  loading?: boolean;
}

function getVariantConfig(
  c: ColorScheme,
): Record<
  AlertVariant,
  { icon: keyof typeof Feather.glyphMap; iconColor: string; bgColor: string }
> {
  return {
    destructive: { icon: 'log-out', iconColor: c.error, bgColor: c.errorLight },
    info: { icon: 'info', iconColor: c.blue, bgColor: c.blueLight },
    warning: { icon: 'alert-triangle', iconColor: c.warning, bgColor: c.warningLight },
    success: { icon: 'check-circle', iconColor: c.success, bgColor: c.successLight },
  };
}

export function AlertDialog({
  visible,
  onClose,
  title,
  message,
  variant = 'info',
  icon,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  loading = false,
}: AlertDialogProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const config = getVariantConfig(c)[variant];
  const resolvedIcon = icon ?? config.icon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.dialog}
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="alert"
        >
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
            <Feather name={resolvedIcon} size={28} color={config.iconColor} />
          </View>

          {/* Text */}
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <View style={styles.buttonWrapper}>
              <Button variant="ghost" onPress={onClose} disabled={loading}>
                {cancelLabel}
              </Button>
            </View>
            {onConfirm && (
              <View style={styles.buttonWrapper}>
                <Button
                  variant={variant === 'destructive' ? 'destructive' : 'primary'}
                  onPress={onConfirm}
                  loading={loading}
                >
                  {confirmLabel}
                </Button>
              </View>
            )}
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
      marginBottom: 28,
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
