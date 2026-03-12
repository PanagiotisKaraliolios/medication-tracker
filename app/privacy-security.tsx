import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useMedications, useSchedules, useDoseLogsByRange } from '../hooks/useQueryHooks';
import { AlertDialog } from '../components/ui/AlertDialog';
import { type ColorScheme, gradients, borderRadius, shadows } from '../components/ui/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { toISO } from '../utils/date';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';

export default function PrivacySecurityScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [signOutAllVisible, setSignOutAllVisible] = useState(false);
  const [signOutAllLoading, setSignOutAllLoading] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [disconnectGoogleVisible, setDisconnectGoogleVisible] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Detect auth providers ──

  const providers = useMemo(() => {
    const identities = user?.identities ?? [];
    const appProviders: string[] = (user?.app_metadata?.providers as string[]) ?? [];
    return {
      hasEmail:
        identities.some((i) => i.provider === 'email') ||
        appProviders.includes('email') ||
        !!user?.user_metadata?.has_password,
      hasGoogle:
        identities.some((i) => i.provider === 'google') ||
        appProviders.includes('google'),
    };
  }, [user?.identities, user?.app_metadata?.providers, user?.user_metadata?.has_password]);

  // ── Data for export ──

  const rangeStartISO = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    return toISO(d);
  }, []);
  const todayISO = useMemo(() => toISO(new Date()), []);

  const { data: medications = [] } = useMedications();
  const { data: schedules = [] } = useSchedules();
  const { data: logs = [] } = useDoseLogsByRange(rangeStartISO, todayISO);

  // ── Handlers ──

  const handleExportData = useCallback(async () => {
    setExporting(true);
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          email: user?.email,
          createdAt: user?.created_at,
        },
        medications: medications.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          form: m.form,
          currentSupply: m.current_supply,
          lowSupplyThreshold: m.low_supply_threshold,
          createdAt: m.created_at,
        })),
        schedules: schedules.map((s) => ({
          frequency: s.frequency,
          selectedDays: s.selected_days,
          timesOfDay: s.times_of_day,
          dosagePerDose: s.dosage_per_dose,
          instructions: s.instructions,
          startDate: s.start_date,
          endDate: s.end_date,
        })),
        doseLogs: logs.map((l) => ({
          scheduledDate: l.scheduled_date,
          timeLabel: l.time_label,
          status: l.status,
          loggedAt: l.logged_at,
        })),
      };

      const json = JSON.stringify(exportData, null, 2);

      await Share.share({
        message: json,
        title: 'MediTrack Data Export',
      });

      Toast.show({ type: 'success', text1: 'Data exported' });
    } catch {
      Toast.show({ type: 'error', text1: 'Export failed', text2: 'Could not export your data' });
    } finally {
      setExporting(false);
    }
  }, [user, medications, schedules, logs]);

  const handleSignOutAll = useCallback(async () => {
    setSignOutAllLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      // Auth listener will handle navigation
    } catch {
      setSignOutAllLoading(false);
      setSignOutAllVisible(false);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to sign out from all devices' });
    }
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    if (!user?.id) return;

    setDeleteLoading(true);
    try {
      // Call the Edge Function which uses admin privileges to delete
      // all user data AND the auth user itself
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No active session');

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_KEY!,
            'Content-Type': 'application/json',
          },
        },
      );

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to delete account');

      // Cancel all local notifications before signing out
      await Notifications.cancelAllScheduledNotificationsAsync();
      // User is already deleted server-side, just clear local session
      await supabase.auth.signOut();
      // Auth listener will handle navigation
    } catch (err: unknown) {
      setDeleteLoading(false);
      setDeleteVisible(false);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err instanceof Error ? err.message : 'Failed to delete account',
      });
    }
  }, [user?.id]);

  const handleConnectGoogle = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const redirectTo = 'medication-tracker://google-callback';
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo },
      });

      if (error || !data.url) {
        Toast.show({ type: 'error', text1: 'Error', text2: error?.message ?? 'Failed to start linking' });
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        const hashPart = result.url.split('#')[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            Toast.show({ type: 'success', text1: 'Google account connected' });
          }
        }
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to connect Google account' });
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    setGoogleLoading(true);
    try {
      // Fetch fresh user data from the server to get the full identities array
      const { data: { user: freshUser }, error: fetchErr } = await supabase.auth.getUser();
      if (fetchErr || !freshUser) throw fetchErr ?? new Error('Could not fetch user');

      const googleIdentity = freshUser.identities?.find((i) => i.provider === 'google');
      if (!googleIdentity) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Google identity not found' });
        return;
      }

      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) throw error;
      await supabase.auth.refreshSession();
      Toast.show({ type: 'success', text1: 'Google account disconnected' });
    } catch (err: unknown) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err instanceof Error ? err.message : 'Failed to disconnect Google account',
      });
    } finally {
      setGoogleLoading(false);
      setDisconnectGoogleVisible(false);
    }
  }, []);

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
          <Text style={styles.headerTitle}>Privacy & Security</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Manage your account security, data, and privacy settings
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Authentication ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="lock" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Authentication</Text>
          </View>

          <View style={styles.card}>
            {/* Linked providers */}
            <View style={styles.providerRow}>
              <Text style={styles.providerLabel}>Sign-in methods</Text>
              <View style={styles.providerBadges}>
                {providers.hasEmail && (
                  <View style={[styles.badge, { backgroundColor: `${c.teal}15` }]}>
                    <Feather name="mail" size={12} color={c.teal} />
                    <Text style={[styles.badgeText, { color: c.teal }]}>Email</Text>
                  </View>
                )}
                {providers.hasGoogle && (
                  <View style={[styles.badge, { backgroundColor: `${c.blue}15` }]}>
                    <Feather name="globe" size={12} color={c.blue} />
                    <Text style={[styles.badgeText, { color: c.blue }]}>Google</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Password action */}
            {providers.hasEmail ? (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push('/change-password')}
                activeOpacity={0.7}
              >
                <View style={styles.actionIcon}>
                  <Feather name="key" size={18} color={c.teal} />
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>Change Password</Text>
                  <Text style={styles.actionSubtitle}>Update your current password</Text>
                </View>
                <Feather name="chevron-right" size={20} color={c.gray400} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => router.push('/set-password')}
                activeOpacity={0.7}
              >
                <View style={styles.actionIcon}>
                  <Feather name="key" size={18} color="#F59E0B" />
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>Set Password</Text>
                  <Text style={styles.actionSubtitle}>
                    Add a password to sign in with email too
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={c.gray400} />
              </TouchableOpacity>
            )}

            <View style={styles.divider} />

            {/* Google connect / disconnect */}
            {providers.hasGoogle ? (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  if (!providers.hasEmail) {
                    Toast.show({
                      type: 'info',
                      text1: 'Set a password first',
                      text2: 'You need email sign-in before disconnecting Google',
                    });
                    return;
                  }
                  setDisconnectGoogleVisible(true);
                }}
                disabled={googleLoading}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${c.error}15` }]}>
                  {googleLoading ? (
                    <ActivityIndicator size="small" color={c.error} />
                  ) : (
                    <Feather name="x-circle" size={18} color={c.error} />
                  )}
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>Disconnect Google</Text>
                  <Text style={styles.actionSubtitle}>
                    {providers.hasEmail
                      ? 'Remove Google as a sign-in method'
                      : 'Set a password first to disconnect'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={c.gray400} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleConnectGoogle}
                disabled={googleLoading}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${c.blue}15` }]}>
                  {googleLoading ? (
                    <ActivityIndicator size="small" color={c.blue} />
                  ) : (
                    <Feather name="globe" size={18} color={c.blue} />
                  )}
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>Connect Google</Text>
                  <Text style={styles.actionSubtitle}>Link your Google account for quick sign-in</Text>
                </View>
                <Feather name="chevron-right" size={20} color={c.gray400} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Sessions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="smartphone" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Sessions</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setSignOutAllVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Feather name="log-out" size={18} color={c.teal} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Sign Out Everywhere</Text>
                <Text style={styles.actionSubtitle}>
                  End all active sessions on other devices
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={c.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Your Data ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="database" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Your Data</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleExportData}
              disabled={exporting}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Feather name="download" size={18} color={c.teal} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>
                  {exporting ? 'Exporting...' : 'Export My Data'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  Download all your medications, schedules, and dose history
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={c.gray400} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Feather name="info" size={14} color={c.gray400} />
              <Text style={styles.infoText}>
                Your data is stored securely in the cloud and is only accessible to you.
                We never share your medical information with third parties.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Danger Zone ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="alert-triangle" size={18} color={c.error} />
            <Text style={[styles.sectionTitle, { color: c.error }]}>Danger Zone</Text>
          </View>

          <View style={[styles.card, { borderWidth: 1, borderColor: `${c.error}30` }]}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setDeleteVisible(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${c.error}15` }]}>
                <Feather name="trash-2" size={18} color={c.error} />
              </View>
              <View style={styles.actionText}>
                <Text style={[styles.actionLabel, { color: c.error }]}>Delete Account</Text>
                <Text style={styles.actionSubtitle}>
                  Permanently remove your account and all associated data
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={c.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sign out all confirmation */}
      <AlertDialog
        visible={signOutAllVisible}
        onClose={() => setSignOutAllVisible(false)}
        variant="warning"
        title="Sign Out Everywhere"
        message="This will end all active sessions, including this one. You will need to sign in again."
        confirmLabel="Sign Out All"
        cancelLabel="Cancel"
        onConfirm={handleSignOutAll}
        loading={signOutAllLoading}
      />

      {/* Delete account confirmation */}
      <AlertDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        variant="destructive"
        title="Delete Account"
        message="This action cannot be undone. All your medications, schedules, dose history, and profile data will be permanently deleted."
        confirmLabel="Delete Everything"
        cancelLabel="Cancel"
        onConfirm={handleDeleteAccount}
        loading={deleteLoading}
      />

      {/* Disconnect Google confirmation */}
      <AlertDialog
        visible={disconnectGoogleVisible}
        onClose={() => setDisconnectGoogleVisible(false)}
        variant="warning"
        title="Disconnect Google"
        message="You will no longer be able to sign in with Google. You can still sign in using your email and password."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        onConfirm={handleDisconnectGoogle}
        loading={googleLoading}
      />
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
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      ...shadows.sm,
      overflow: 'hidden',
    },
    providerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    providerLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: c.gray600,
    },
    providerBadges: {
      flexDirection: 'row',
      gap: 8,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.round,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: c.gray100,
      marginHorizontal: 16,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${c.teal}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: {
      flex: 1,
    },
    actionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
    },
    actionSubtitle: {
      fontSize: 12,
      color: c.gray500,
      marginTop: 2,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: c.gray400,
      lineHeight: 18,
    },
  });
}
