import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { borderRadius, type ColorScheme, gradients, shadows } from '../components/ui/theme';
import { useAuth } from '../contexts/AuthContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { supabase } from '../lib/supabase';

export default function SetPasswordScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { user } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const isValid = password.length >= 8 && password === confirmPassword;

  const handleSetPassword = async () => {
    if (!password.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a password' });
      return;
    }
    if (password.length < 8) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Password must be at least 8 characters',
      });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Passwords do not match' });
      return;
    }

    setSaving(true);
    try {
      // Use Edge Function with admin API to properly create the email identity
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No active session');

      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/set-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to set password');

      // Sign back in with the new password to get a fresh session
      // (admin.updateUserById invalidates the current session)
      const email = user?.email;
      if (email) {
        await supabase.auth.signInWithPassword({ email, password });
      }

      Toast.show({
        type: 'success',
        text1: 'Password set',
        text2: 'You can now sign in with email and password',
      });
      router.back();
    } catch (err: unknown) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err instanceof Error ? err.message : 'Failed to set password',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[...gradients.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color={c.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Password</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Add a password so you can also sign in with your email
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Info card */}
          <View style={styles.infoCard}>
            <Feather name="info" size={18} color={c.blue} />
            <Text style={styles.infoText}>
              You signed in with Google. Setting a password lets you also sign in with{' '}
              {user?.email ?? 'your email'} and a password.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <Input
                icon={<Feather name="lock" size={20} color={c.gray400} />}
                placeholder="At least 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={c.gray400} />
                  </TouchableOpacity>
                }
              />
              {password.length > 0 && password.length < 8 && (
                <Text style={styles.hint}>Must be at least 8 characters</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm Password</Text>
              <Input
                icon={<Feather name="lock" size={20} color={c.gray400} />}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                    <Feather name={showConfirm ? 'eye-off' : 'eye'} size={20} color={c.gray400} />
                  </TouchableOpacity>
                }
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <Text style={styles.hint}>Passwords do not match</Text>
              )}
            </View>
          </View>

          {/* Submit */}
          <View style={styles.actions}>
            <Button
              variant="primary"
              onPress={handleSetPassword}
              loading={saving}
              disabled={!isValid}
            >
              Set Password
            </Button>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingTop: 56,
      paddingHorizontal: 24,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: c.white,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      marginTop: 4,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: `${c.blue}10`,
      borderRadius: borderRadius.lg,
      padding: 16,
      marginBottom: 24,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: c.gray600,
      lineHeight: 20,
    },
    formCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      ...shadows.sm,
      padding: 20,
      gap: 20,
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray900,
    },
    hint: {
      fontSize: 12,
      color: c.error,
      marginTop: 2,
    },
    actions: {
      marginTop: 24,
    },
  });
}
