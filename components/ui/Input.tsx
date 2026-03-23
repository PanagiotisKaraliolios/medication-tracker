import { type ReactNode, useMemo } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View, type ViewStyle } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, type ColorScheme } from './theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  icon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({ icon, rightIcon, containerStyle, ...inputProps }: InputProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[styles.container, containerStyle]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <TextInput
        placeholderTextColor={c.gray400}
        style={[
          styles.input,
          icon ? styles.inputWithIcon : null,
          rightIcon ? styles.inputWithRightIcon : null,
        ]}
        {...inputProps}
      />
      {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      position: 'relative',
      width: '100%',
    },
    iconContainer: {
      position: 'absolute',
      left: 16,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 1,
    },
    input: {
      height: 56,
      borderRadius: borderRadius.lg,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.gray200,
      paddingHorizontal: 16,
      fontSize: 16,
      color: c.gray900,
    },
    inputWithIcon: {
      paddingLeft: 48,
    },
    inputWithRightIcon: {
      paddingRight: 48,
    },
    rightIconContainer: {
      position: 'absolute',
      right: 16,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 1,
    },
  });
}
