import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { type ColorScheme, borderRadius, gradients } from './theme';
import { useThemeColors } from '../../hooks/useThemeColors';

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
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isDisabled}
        style={[{ opacity: isDisabled ? 0.6 : 1 }, style]}
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
      </TouchableOpacity>
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
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        vs.container,
        { opacity: isDisabled ? 0.6 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vs.text.color as string} />
      ) : (
        <Text style={[styles.text, vs.text]}>{children}</Text>
      )}
    </TouchableOpacity>
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
