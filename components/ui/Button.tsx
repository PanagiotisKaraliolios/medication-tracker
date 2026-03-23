import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, type ColorScheme, gradients } from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps {
  children: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  children,
  variant = 'primary',
  onPress,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={[{ opacity: isDisabled ? 0.6 : 1 }, style]}
        accessibilityRole="button"
        accessibilityLabel={children}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.base}
        >
          {loading ? (
            <ActivityIndicator color={c.white} />
          ) : (
            <Text style={styles.primaryText}>{children}</Text>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  const variantStyles: Record<string, { container: ViewStyle; text: TextStyle }> = {
    secondary: {
      container: {
        backgroundColor: c.card,
        borderWidth: 2,
        borderColor: c.teal,
      },
      text: { color: c.teal },
    },
    destructive: {
      container: { backgroundColor: c.error },
      text: { color: c.white },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: c.gray600 },
    },
  };

  const vs = variantStyles[variant] || variantStyles.secondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, vs.container, { opacity: isDisabled ? 0.6 : 1 }, style]}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={vs.text.color as string} />
      ) : (
        <Text style={[styles.text, vs.text]}>{children}</Text>
      )}
    </Pressable>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    base: {
      height: 56,
      paddingHorizontal: 20,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    primaryText: {
      color: c.white,
      fontSize: 16,
      fontWeight: '600',
    },
    text: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
