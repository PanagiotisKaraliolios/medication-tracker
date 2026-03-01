import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useThemePreference, type ThemePreference } from '../../contexts/ThemeContext';
import { useMedications, useSchedules, useDoseLogsByRange } from '../../hooks/useQueryHooks';
import { AlertDialog } from '../../components/ui/AlertDialog';
import { type ColorScheme, gradients, borderRadius, shadows } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import Toast from 'react-native-toast-message';
import { toISO } from '../../utils/date';
import { computeAdherence, computeStreak } from '../../utils/adherence';

type MenuItem = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  color?: string;
};

const menuItems: MenuItem[] = [
  { icon: 'edit', label: 'Edit Profile', subtitle: 'View and edit your profile' },
  { icon: 'share-2', label: 'Caregiver Sharing', subtitle: 'Share with family or caregivers' },
  { icon: 'bell', label: 'Notifications', subtitle: 'Manage alert preferences' },
  { icon: 'shield', label: 'Privacy & Security', subtitle: 'Data and account settings' },
  { icon: 'help-circle', label: 'Help & Support', subtitle: 'FAQ and contact' },
];

const themeOptions: { value: ThemePreference; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'smartphone' },
  { value: 'light', label: 'Light', icon: 'sun' },
];

export default function ProfileScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { user, profileName, signOut } = useAuth();
  const { preference, setPreference } = useThemePreference();
  const router = useRouter();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // ── Date ranges for stats ──

  const { todayISO, adherenceStartISO, rangeStartISO } = useMemo(() => {
    const today = new Date();
    const tISO = toISO(today);

    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    const aStartISO = toISO(start);

    const streakStart = new Date(today);
    streakStart.setDate(streakStart.getDate() - 365);
    const sStartISO = toISO(streakStart);

    return {
      todayISO: tISO,
      adherenceStartISO: aStartISO,
      rangeStartISO: sStartISO < aStartISO ? sStartISO : aStartISO,
    };
  }, []);

  // ── Queries ──

  const { data: medications = [], refetch: refetchMeds } = useMedications();
  const { data: schedules = [], refetch: refetchSchedules } = useSchedules();
  const { data: logs = [], refetch: refetchLogs } = useDoseLogsByRange(rangeStartISO, todayISO);

  // ── Pull-to-refresh ──

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMeds(), refetchSchedules(), refetchLogs()]);
    setRefreshing(false);
  }, [refetchMeds, refetchSchedules, refetchLogs]);

  // ── Computed stats ──

  const medCount = medications.length;
  const adherence = useMemo(
    () => computeAdherence(adherenceStartISO, todayISO, medications, schedules, logs),
    [adherenceStartISO, todayISO, medications, schedules, logs],
  );
  const streak = useMemo(
    () => computeStreak(todayISO, medications, schedules, logs),
    [todayISO, medications, schedules, logs],
  );

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await signOut();
    } catch {
      setLogoutLoading(false);
      setLogoutVisible(false);
      Toast.show({ type: 'error', text1: 'Logout failed', text2: 'Please try again' });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[c.teal]} tintColor={c.teal} />
        }
      >
        {/* Gradient header */}
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.avatar}>
            <Feather name="user" size={36} color={c.teal} />
          </View>
          <Text style={styles.headerName}>{profileName || user?.email?.split('@')[0] || 'User'}</Text>
          <Text style={styles.headerEmail}>{user?.email ?? ''}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {([
              { value: String(medCount), label: 'Medications' },
              { value: `${adherence}%`, label: 'Adherence' },
              { value: String(streak), label: 'Day Streak' },
            ]).map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={styles.statDivider} />}
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Theme toggle */}
          <View style={styles.themeCard}>
            <View style={styles.themeHeader}>
              <Feather name="moon" size={18} color={c.gray600} />
              <Text style={styles.themeTitle}>Appearance</Text>
            </View>
            <View style={styles.themeToggle}>
              {themeOptions.map((opt) => {
                const isActive = preference === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.themeOption, isActive && styles.themeOptionActive]}
                    onPress={() => setPreference(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={opt.icon}
                      size={16}
                      color={isActive ? c.white : c.gray500}
                    />
                    <Text style={[styles.themeOptionText, isActive && styles.themeOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Menu items */}
          <View style={styles.menuCard}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.menuItem,
                  i < menuItems.length - 1 && styles.menuItemBorder,
                ]}
                activeOpacity={0.7}
                onPress={
                  item.label === 'Edit Profile'
                    ? () => router.push('/profile/edit')
                    : item.label === 'Notifications'
                      ? () => router.push('/notification-settings')
                      : item.label === 'Privacy & Security'
                        ? () => router.push('/privacy-security')
                        : undefined
                }
              >
                <View style={styles.menuIcon}>
                  <Feather name={item.icon} size={20} color={c.teal} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
                <Feather name="chevron-right" size={20} color={c.gray400} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setLogoutVisible(true)}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={20} color={c.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>MediTrack v1.1.1</Text>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <AlertDialog
        visible={logoutVisible}
        onClose={() => setLogoutVisible(false)}
        variant="destructive"
        title="Log Out"
        message="Are you sure you want to log out? You'll need to sign in again to access your medications."
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        loading={logoutLoading}
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
      paddingTop: 60,
      paddingHorizontal: 24,
      paddingBottom: 32,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      alignItems: 'center',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.white,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    headerName: {
      fontSize: 22,
      fontWeight: '700',
      color: c.white,
    },
    headerEmail: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
      marginBottom: 24,
    },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: borderRadius.lg,
      paddingVertical: 16,
      paddingHorizontal: 20,
      width: '100%',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: c.white,
    },
    statLabel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
    },
    statDivider: {
      width: 1,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    themeCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      ...shadows.sm,
      padding: 16,
      marginBottom: 16,
    },
    themeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    themeTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
    },
    themeToggle: {
      flexDirection: 'row',
      backgroundColor: c.gray100,
      borderRadius: borderRadius.md,
      padding: 3,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: borderRadius.md - 2,
    },
    themeOptionActive: {
      backgroundColor: c.teal,
    },
    themeOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.gray500,
    },
    themeOptionTextActive: {
      color: c.white,
    },
    menuCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      ...shadows.sm,
      marginBottom: 24,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    menuItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: c.gray100,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${c.teal}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuText: {
      flex: 1,
    },
    menuLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
    },
    menuSubtitle: {
      fontSize: 13,
      color: c.gray500,
      marginTop: 2,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      height: 56,
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.error,
      marginBottom: 16,
    },
    logoutText: {
      fontSize: 16,
      fontWeight: '600',
      color: c.error,
    },
    version: {
      fontSize: 13,
      color: c.gray400,
      textAlign: 'center',
    },
  });
}
