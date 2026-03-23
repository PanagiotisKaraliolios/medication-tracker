import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BatteryOptimizationModal } from '../components/ui/BatteryOptimizationModal';
import ErrorBoundaryWrapper from '../components/ui/ErrorBoundary';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemePreferenceProvider, useThemePreference } from '../contexts/ThemeContext';
import { useAppOpenAd } from '../hooks/useAppOpenAd';
import { useBatteryOptimization } from '../hooks/useBatteryOptimization';
import { useResponsive } from '../hooks/useResponsive';
import { initializeAds } from '../lib/ads';
import { preloadInterstitial } from '../lib/interstitialManager';
import {
  fireMissedDoseReminders,
  type MissedDoseLogInput,
  recheckAllLowSupplyReminders,
  registerNotificationHandler,
  rescheduleAllMedicationReminders,
} from '../lib/notifications';
import { queryClient, queryPersister } from '../lib/queryClient';
import { supabase } from '../lib/supabase';
import { updateWidget } from '../lib/widgetBridge';
import { useAdPreferences } from '../stores/adPreferencesStore';
import type { DoseLogRow, MedicationRow, ScheduleRow } from '../types/database';

// Register notification handler ASAP so foreground notifications display correctly
registerNotificationHandler();

// Initialize Mobile Ads SDK (consent + init) once at module level
initializeAds().then(() => preloadInterstitial());

import Toast, { BaseToast, type BaseToastProps, ErrorToast } from 'react-native-toast-message';
import { borderRadius, colors, darkColors, shadows } from '../components/ui/theme';

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
  const { shouldShowModal, openBatterySettings, dismissModal } = useBatteryOptimization();

  // Show App Open ad when returning from background (authenticated users only)
  useAppOpenAd();

  // Lock phones to portrait; allow tablets to rotate freely
  const { isTablet } = useResponsive();
  useEffect(() => {
    ScreenOrientation.lockAsync(
      isTablet
        ? ScreenOrientation.OrientationLock.DEFAULT
        : ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
  }, [isTablet]);

  // Load persisted ad preferences
  useEffect(() => {
    useAdPreferences.getState().load();
  }, []);

  // Sync notification reminders from Supabase → local device
  const syncReminders = useCallback(async () => {
    if (!session || loading || hasProfile !== true) return;
    try {
      const [{ data: schedData, error: schedErr }, { data: medData, error: medErr }] =
        await Promise.all([
          supabase
            .from('schedules')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('is_active', true),
          supabase
            .from('medications')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('is_active', true),
        ]);
      if (schedErr || medErr) return;

      const schedules = (schedData ?? []) as ScheduleRow[];
      const meds = (medData ?? []) as MedicationRow[];

      // Build a map from schedule ID → medication name
      const medNameById = Object.fromEntries(meds.map((m) => [m.id, m.name]));
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
          interval_days: s.interval_days,
          start_date: s.start_date,
        })),
        scheduleToMedName,
      );

      // Check all medications for low supply and schedule/cancel reminders
      await recheckAllLowSupplyReminders(meds);

      // Fire catch-up notifications for doses missed while the phone was off
      const todayISO = new Date().toISOString().slice(0, 10);
      const { data: logData } = await supabase
        .from('dose_logs')
        .select('schedule_id, time_label')
        .eq('user_id', session.user.id)
        .eq('scheduled_date', todayISO);

      await fireMissedDoseReminders(
        schedules.map((s) => ({
          id: s.id,
          medication_id: s.medication_id,
          frequency: s.frequency,
          selected_days: s.selected_days,
          times_of_day: s.times_of_day,
          push_notifications: s.push_notifications,
          interval_days: s.interval_days,
          start_date: s.start_date,
        })),
        (logData ?? []) as MissedDoseLogInput[],
        scheduleToMedName,
      );

      // Push widget data so home screen widget shows current next dose
      const { data: fullLogData } = await supabase
        .from('dose_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('scheduled_date', todayISO);
      updateWidget(meds, schedules, (fullLogData ?? []) as DoseLogRow[]);
    } catch (err) {
      console.warn('[Layout] Failed to sync reminders:', err);
    }
  }, [session, loading, hasProfile]);

  // Register reminders on initial app launch
  useEffect(() => {
    if (remindersRegistered.current) return;
    if (!session || loading || hasProfile !== true) return;
    remindersRegistered.current = true;
    syncReminders();
  }, [session, loading, hasProfile, syncReminders]);

  // Re-sync reminders when app returns to foreground (picks up changes from other devices)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncReminders();
    });
    return () => sub.remove();
  }, [syncReminders]);

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
  }, [session, loading, hasProfile, segments, router.replace]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: c.background,
        }}
      >
        <ActivityIndicator size="large" color={c.teal} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="auth/profile-setup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="medication/add"
          options={{ presentation: 'modal', headerShown: true, title: 'Add Medication' }}
        />
        <Stack.Screen
          name="medication/select"
          options={{ headerShown: true, title: 'Select Medication' }}
        />
        <Stack.Screen
          name="medication/schedule"
          options={{ headerShown: true, title: 'Set Schedule' }}
        />
        <Stack.Screen
          name="medication/reminders"
          options={{ headerShown: true, title: 'Reminders' }}
        />
        <Stack.Screen
          name="medication/review"
          options={{ headerShown: true, title: 'Review Details' }}
        />
        <Stack.Screen name="medication/success" options={{ headerShown: false }} />
        <Stack.Screen
          name="medication/[id]"
          options={{ headerShown: true, title: 'Medication Details' }}
        />
        <Stack.Screen
          name="medication/edit"
          options={{ headerShown: true, title: 'Edit Medication' }}
        />
        <Stack.Screen
          name="medication/edit-schedule"
          options={{ headerShown: true, title: 'Edit Schedule' }}
        />
        <Stack.Screen
          name="medication/log-prn"
          options={{ headerShown: true, title: 'Log PRN Dose' }}
        />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-security" options={{ headerShown: false }} />
        <Stack.Screen name="set-password" options={{ headerShown: false }} />
        <Stack.Screen name="change-password" options={{ headerShown: false }} />
        <Stack.Screen name="ad-preferences" options={{ headerShown: false }} />
        <Stack.Screen name="log-symptom" options={{ headerShown: true, title: 'Log Symptom' }} />
        <Stack.Screen name="support-developer" options={{ headerShown: false }} />
      </Stack>

      {/* Battery optimization prompt — Android only, shown once for authenticated users */}
      {session && hasProfile === true && (
        <BatteryOptimizationModal
          visible={shouldShowModal}
          onOpenSettings={openBatterySettings}
          onDismiss={dismissModal}
        />
      )}
    </>
  );
}

function buildToastConfig(scheme: 'light' | 'dark') {
  const c = scheme === 'dark' ? darkColors : colors;
  const sharedStyle = {
    backgroundColor: c.card,
    borderRadius: borderRadius.lg,
    ...shadows.md,
    paddingHorizontal: 4,
    height: undefined as unknown as number,
    paddingVertical: 14,
  };
  const text1 = { fontSize: 14, fontWeight: '600' as const, color: c.gray900 };
  const text2 = { fontSize: 12, color: c.gray500, marginTop: 2 };
  const content = { paddingHorizontal: 14 };

  return {
    success: (props: BaseToastProps) => (
      <BaseToast
        {...props}
        style={{ ...sharedStyle, borderLeftWidth: 4, borderLeftColor: c.success }}
        contentContainerStyle={content}
        text1Style={text1}
        text2Style={text2}
      />
    ),
    error: (props: BaseToastProps) => (
      <ErrorToast
        {...props}
        style={{ ...sharedStyle, borderLeftWidth: 4, borderLeftColor: c.error }}
        contentContainerStyle={content}
        text1Style={text1}
        text2Style={text2}
      />
    ),
    info: (props: BaseToastProps) => (
      <BaseToast
        {...props}
        style={{ ...sharedStyle, borderLeftWidth: 4, borderLeftColor: c.teal }}
        contentContainerStyle={content}
        text1Style={text1}
        text2Style={text2}
      />
    ),
  };
}

const rootStyle = { flex: 1 } as const;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={rootStyle}>
      <ThemePreferenceProvider>
        <ErrorBoundaryWrapper>
          <RootLayoutInner />
        </ErrorBoundaryWrapper>
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutInner() {
  const { resolvedScheme } = useThemePreference();
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
      <ThemeProvider value={resolvedScheme === 'dark' ? DarkNavTheme : LightNavTheme}>
        <AuthProvider>
          <AutocompleteDropdownContextProvider>
            <RootLayoutNav />
          </AutocompleteDropdownContextProvider>
          <Toast config={buildToastConfig(resolvedScheme)} />
        </AuthProvider>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
