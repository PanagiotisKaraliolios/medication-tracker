import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemePreferenceProvider, useThemePreference } from '../contexts/ThemeContext';
import { queryClient } from '../lib/queryClient';
import { registerNotificationHandler, rescheduleAllMedicationReminders, recheckAllLowSupplyReminders } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import type { MedicationRow, ScheduleRow } from '../types/database';
import { useEffect, useRef } from 'react';

// Register notification handler ASAP so foreground notifications display correctly
registerNotificationHandler();
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { colors, darkColors } from '../components/ui/theme';

const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.gray900,
    border: colors.gray200,
    primary: colors.teal,
  },
};

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: darkColors.background,
    card: darkColors.card,
    text: darkColors.gray900,
    border: darkColors.gray200,
    primary: darkColors.teal,
  },
};

function RootLayoutNav() {
  useReactQueryDevTools(queryClient);

  const { session, loading, hasProfile } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { resolvedScheme, colors: c } = useThemePreference();
  const remindersRegistered = useRef(false);

  // Re-register medication reminders on app launch once user is authenticated
  useEffect(() => {
    if (!session || loading || hasProfile !== true || remindersRegistered.current) return;
    remindersRegistered.current = true;

    (async () => {
      try {
        const [{ data: schedData, error: schedErr }, { data: medData, error: medErr }] = await Promise.all([
          supabase.from('schedules').select('*').eq('user_id', session.user.id).eq('is_active', true),
          supabase.from('medications').select('*').eq('user_id', session.user.id).eq('is_active', true),
        ]);
        if (schedErr || medErr) return;

        const schedules = (schedData ?? []) as ScheduleRow[];
        const meds = (medData ?? []) as MedicationRow[];

        // Build a map from schedule ID → medication name
        const medNameById = Object.fromEntries(
          meds.map((m) => [m.id, m.name]),
        );
        const scheduleToMedName: Record<string, string> = {};
        for (const s of schedules) {
          scheduleToMedName[s.id] = medNameById[s.medication_id] ?? 'your medication';
        }

        await rescheduleAllMedicationReminders(
          schedules.map((s) => ({
            id: s.id,
            medication_id: s.medication_id,
            frequency: s.frequency,
            selected_days: s.selected_days,
            times_of_day: s.times_of_day,
            push_notifications: s.push_notifications,
            snooze_duration: s.snooze_duration,
            dosage_per_dose: s.dosage_per_dose,
          })),
          scheduleToMedName,
        );

        // Check all medications for low supply and schedule/cancel reminders
        await recheckAllLowSupplyReminders(meds);
      } catch (err) {
        console.warn('[Layout] Failed to re-register reminders:', err);
      }
    })();
  }, [session, loading, hasProfile]);

  useEffect(() => {
    if (loading) return;

    const segs = segments as string[];
    const isProfileSetup = segs?.[0] === 'auth' && segs?.[1] === 'profile-setup';
    const inPublicAuth = (segs?.[0] === 'auth' && !isProfileSetup) || segs?.[0] === 'index';
    const isWelcome = !segs || segs.length === 0 || segs?.[0] === 'index';

    if (!session && !(inPublicAuth || isWelcome)) {
      router.replace('/');
    } else if (session) {
      if (hasProfile === false && !isProfileSetup) {
        router.replace('/auth/profile-setup');
      } else if (hasProfile === true && (inPublicAuth || isWelcome)) {
        router.replace('/(tabs)');
      }
    }
  }, [session, loading, hasProfile, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background }}>
        <ActivityIndicator size="large" color={c.teal} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/signup" />
      <Stack.Screen name="auth/profile-setup" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="medication/add" options={{ presentation: 'modal', headerShown: true, title: 'Add Medication' }} />
      <Stack.Screen name="medication/select" options={{ headerShown: true, title: 'Select Medication' }} />
      <Stack.Screen name="medication/schedule" options={{ headerShown: true, title: 'Set Schedule' }} />
      <Stack.Screen name="medication/reminders" options={{ headerShown: true, title: 'Reminders' }} />
      <Stack.Screen name="medication/review" options={{ headerShown: true, title: 'Review Details' }} />
      <Stack.Screen name="medication/success" options={{ headerShown: false }} />
      <Stack.Screen name="medication/[id]" options={{ headerShown: true, title: 'Medication Details' }} />
      <Stack.Screen name="medication/edit" options={{ headerShown: true, title: 'Edit Medication' }} />
      <Stack.Screen name="medication/edit-schedule" options={{ headerShown: true, title: 'Edit Schedule' }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: true, title: 'Edit Profile' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootLayoutInner />
    </ThemePreferenceProvider>
  );
}

function RootLayoutInner() {
  const { resolvedScheme } = useThemePreference();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={resolvedScheme === 'dark' ? DarkNavTheme : LightNavTheme}>
        <AuthProvider>
          <RootLayoutNav />
          <Toast />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
