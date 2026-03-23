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
import { Button } from '../../components/ui/Button';
import { DatePickerModal } from '../../components/ui/DatePickerModal';
import { Input } from '../../components/ui/Input';
import { borderRadius, type ColorScheme, gradients } from '../../components/ui/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { supabase } from '../../lib/supabase';

export default function ProfileSetupScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { user, checkProfile } = useAuth();
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const formatDisplayDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleComplete = async () => {
    if (!name) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter your name' });
      return;
    }

    // Get the current user from auth context or directly from Supabase session
    let userId = user?.id;
    if (!userId) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    if (!userId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No user found. Please log in again.' });
      router.replace('/auth/login');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: name,
      date_of_birth: dateOfBirth,
      updated_at: new Date().toISOString(),
    });

    setLoading(false);

    if (error) {
      Toast.show({ type: 'error', text1: 'Error saving profile', text2: error.message });
    } else {
      Toast.show({ type: 'success', text1: 'Success', text2: 'Profile setup complete' });
      await checkProfile(userId);
      router.replace('/(tabs)');
    }
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
        <View style={styles.header}>
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Feather name="user" size={40} color={c.white} />
          </LinearGradient>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself to personalize your experience
          </Text>
        </View>

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Full Name</Text>
            <Input
              icon={<Feather name="user" size={20} color={c.gray400} />}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text style={styles.label}>
              Date of Birth <Text style={styles.optionalBadge}>(optional)</Text>
            </Text>
            <TouchableOpacity
              style={styles.dobButton}
              onPress={() => setShowDobPicker(true)}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={20} color={c.gray400} />
              <Text style={[styles.dobText, !dateOfBirth && styles.dobPlaceholder]}>
                {dateOfBirth ? formatDisplayDate(dateOfBirth) : 'Select date of birth'}
              </Text>
              {dateOfBirth && (
                <TouchableOpacity onPress={() => setDateOfBirth(null)} hitSlop={8}>
                  <Feather name="x" size={18} color={c.gray400} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            <DatePickerModal
              visible={showDobPicker}
              onClose={() => setShowDobPicker(false)}
              onConfirm={(date) => setDateOfBirth(date)}
              initialDate={dateOfBirth ?? '1990-01-01'}
              maxDate={todayISO}
              title="Date of Birth"
            />
          </View>

          <Button variant="primary" onPress={handleComplete} loading={loading}>
            Complete Setup
          </Button>
        </View>
      </ScrollView>
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
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 80,
      paddingBottom: 40,
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: c.gray900,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: c.gray600,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 280,
    },
    form: {
      gap: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray700,
      marginBottom: 8,
    },
    optionalBadge: {
      fontSize: 12,
      fontWeight: '400',
      color: c.gray400,
    },
    dobButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.gray200,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dobText: {
      flex: 1,
      fontSize: 15,
      color: c.gray900,
    },
    dobPlaceholder: {
      color: c.gray400,
    },
  });
}
