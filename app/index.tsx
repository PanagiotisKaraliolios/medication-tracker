import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { type ColorScheme, borderRadius } from '../components/ui/theme';
import { useThemeColors } from '../hooks/useThemeColors';

export default function WelcomeScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App icon */}
        <Image
          source={require('../assets/icon.png')}
          style={styles.iconImage}
        />

        <Text style={styles.title}>Never Miss{'\n'}a Dose</Text>
        <Text style={styles.subtitle}>
          Track your medications, set reminders, and stay on top of your health journey.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button variant="primary" onPress={() => router.push('/auth/signup')}>
          Get Started
        </Button>

        <TouchableOpacity
          onPress={() => router.push('/auth/login')}
          style={styles.loginLink}
          activeOpacity={0.7}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginTextBold}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      paddingHorizontal: 24,
      paddingTop: 80,
      paddingBottom: 48,
      justifyContent: 'space-between',
    },
    content: {
      alignItems: 'center',
      marginTop: 40,
    },
    iconImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      marginBottom: 32,
    },
    title: {
      fontSize: 36,
      fontWeight: '700',
      color: c.gray900,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 44,
    },
    subtitle: {
      fontSize: 16,
      color: c.gray600,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 300,
    },
    buttonContainer: {
      width: '100%',
      gap: 16,
      alignItems: 'center',
    },
    loginLink: {
      paddingVertical: 8,
    },
    loginText: {
      fontSize: 15,
      color: c.gray600,
    },
    loginTextBold: {
      color: c.teal,
      fontWeight: '600',
    },
  });
}
