import { Feather } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import type React from 'react';
import { Component } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, type ColorScheme, shadows } from './theme';

interface Props {
  children: React.ReactNode;
  colorScheme: ColorScheme;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleRestart = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const c = this.props.colorScheme;
    const styles = makeStyles(c);

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Feather name="alert-triangle" size={48} color={c.error} />
          </View>

          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            An unexpected error occurred. You can try again or restart the app.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={this.handleRetry}
            activeOpacity={0.8}
          >
            <Feather name="refresh-cw" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={this.handleRestart}
            activeOpacity={0.8}
          >
            <Feather name="power" size={18} color={c.teal} />
            <Text style={styles.secondaryButtonText}>Restart App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

export default function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  return <ErrorBoundary colorScheme={c}>{children}</ErrorBoundary>;
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      padding: 32,
      alignItems: 'center',
      width: '100%',
      maxWidth: 400,
      ...shadows.md,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: borderRadius.round,
      backgroundColor: c.errorLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: c.gray900,
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 15,
      color: c.gray500,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 28,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.teal,
      borderRadius: borderRadius.md,
      paddingVertical: 14,
      paddingHorizontal: 24,
      width: '100%',
      gap: 8,
      marginBottom: 12,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.tealLight,
      borderRadius: borderRadius.md,
      paddingVertical: 14,
      paddingHorizontal: 24,
      width: '100%',
      gap: 8,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: c.teal,
    },
  });
}
