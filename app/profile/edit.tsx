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
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Feather name="user" size={36} color={c.teal} />
          </View>
          <Text style={styles.avatarName}>{profileName || 'User'}</Text>
          <Text style={styles.avatarEmail}>{user?.email ?? ''}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Form */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="user" size={18} color={c.gray600} />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

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
            </View>
          </View>

          {/* Email (read-only) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="mail" size={18} color={c.gray600} />
              <Text style={styles.sectionTitle}>Account</Text>
            </View>

            <View style={styles.formCard}>
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
      alignItems: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 16,
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
    avatarSection: {
      alignItems: 'center',
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: c.white,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    avatarName: {
      fontSize: 18,
      fontWeight: '700',
      color: c.white,
    },
    avatarEmail: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
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
      color: c.gray400,
      marginTop: 2,
    },
    actions: {
      marginBottom: 16,
    },
  });
}
