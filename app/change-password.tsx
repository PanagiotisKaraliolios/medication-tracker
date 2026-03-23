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

export default function ChangePasswordScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword;

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter your current password' });
      return;
    }
    if (newPassword.length < 8) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'New password must be at least 8 characters',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Passwords do not match' });
      return;
    }
    if (newPassword === currentPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'New password must be different from current password',
      });
      return;
    }

    setSaving(true);

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    });

    if (signInError) {
      setSaving(false);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Current password is incorrect' });
      return;
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Password changed',
        text2: 'Your password has been updated',
      });
      router.back();
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
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>Enter your current password and choose a new one</Text>
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
          {/* Form */}
          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>Current Password</Text>
              <Input
                icon={<Feather name="lock" size={20} color={c.gray400} />}
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                rightIcon={
                  <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                    <Feather name={showCurrent ? 'eye-off' : 'eye'} size={20} color={c.gray400} />
                  </TouchableOpacity>
                }
              />
            </View>

            <View style={styles.separator} />

            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <Input
                icon={<Feather name="lock" size={20} color={c.gray400} />}
                placeholder="At least 8 characters"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                rightIcon={
                  <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                    <Feather name={showNew ? 'eye-off' : 'eye'} size={20} color={c.gray400} />
                  </TouchableOpacity>
                }
              />
              {newPassword.length > 0 && newPassword.length < 8 && (
                <Text style={styles.hint}>Must be at least 8 characters</Text>
              )}
              {newPassword.length >= 8 && newPassword === currentPassword && (
                <Text style={styles.hint}>Must be different from current password</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm New Password</Text>
              <Input
                icon={<Feather name="lock" size={20} color={c.gray400} />}
                placeholder="Re-enter new password"
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
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.hint}>Passwords do not match</Text>
              )}
            </View>
          </View>

          {/* Submit */}
          <View style={styles.actions}>
            <Button
              variant="primary"
              onPress={handleChangePassword}
              loading={saving}
              disabled={!isValid}
            >
              Change Password
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
    separator: {
      height: 1,
      backgroundColor: c.gray100,
    },
    actions: {
      marginTop: 24,
    },
  });
}
