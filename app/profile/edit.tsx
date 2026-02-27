import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AlertDialog } from '../../components/ui/AlertDialog';
import {
  type ColorScheme,
  gradients,
  borderRadius,
  shadows,
} from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import Toast from 'react-native-toast-message';

export default function EditProfileScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { user, profileName, profileAge, checkProfile } = useAuth();

  const [name, setName] = useState(profileName ?? '');
  const [age, setAge] = useState(profileAge != null ? String(profileAge) : '');
  const [saving, setSaving] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const hasChanges =
    name !== (profileName ?? '') ||
    age !== (profileAge != null ? String(profileAge) : '');

  const handleSave = async () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Name is required' });
      return;
    }
    if (!age.trim() || Number.isNaN(parseInt(age, 10))) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a valid age' });
      return;
    }

    const userId = user?.id;
    if (!userId) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: name.trim(),
        age: parseInt(age, 10),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    setSaving(false);

    if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } else {
      Toast.show({ type: 'success', text1: 'Profile updated' });
      await checkProfile(userId);
      router.back();
    }
  };

  const handleDeleteAccount = async () => {
    const userId = user?.id;
    if (!userId) return;

    setDeleteLoading(true);

    // Delete profile row first, then sign out
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      setDeleteLoading(false);
      setDeleteVisible(false);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
      return;
    }

    await supabase.auth.signOut();
    // Auth listener will handle navigation
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar header */}
        <View style={styles.avatarSection}>
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Feather name="user" size={36} color={c.white} />
          </LinearGradient>
          <Text style={styles.avatarName}>{profileName || 'User'}</Text>
          <Text style={styles.avatarEmail}>{user?.email ?? ''}</Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <Input
              icon={<Feather name="user" size={20} color={c.gray400} />}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Age</Text>
            <Input
              icon={<Feather name="calendar" size={20} color={c.gray400} />}
              placeholder="Enter your age"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Input
              icon={<Feather name="mail" size={20} color={c.gray400} />}
              value={user?.email ?? ''}
              editable={false}
            />
            <Text style={styles.hint}>Email cannot be changed</Text>
          </View>
        </View>

        {/* Save */}
        <View style={styles.actions}>
          <Button
            variant="primary"
            onPress={handleSave}
            loading={saving}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </View>

        {/* Danger zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => setDeleteVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={18} color={c.error} />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
          <Text style={styles.dangerHint}>
            This will permanently delete your profile and medication data.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AlertDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        variant="destructive"
        title="Delete Account"
        message="This action cannot be undone. All your profile data, medications, and history will be permanently deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteAccount}
        loading={deleteLoading}
      />
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 40,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 28,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    avatarName: {
      fontSize: 20,
      fontWeight: '700',
      color: c.gray900,
    },
    avatarEmail: {
      fontSize: 14,
      color: c.gray500,
      marginTop: 2,
    },
    formCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      ...shadows.sm,
      padding: 20,
      gap: 20,
      marginBottom: 20,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray700,
    },
    hint: {
      fontSize: 12,
      color: c.gray400,
      marginTop: 4,
    },
    actions: {
      marginBottom: 32,
    },
    dangerSection: {
      borderTopWidth: 1,
      borderTopColor: c.gray200,
      paddingTop: 20,
    },
    dangerTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.error,
      marginBottom: 12,
    },
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.error,
      backgroundColor: c.card,
    },
    dangerButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.error,
    },
    dangerHint: {
      fontSize: 12,
      color: c.gray400,
      marginTop: 8,
    },
  });
}
