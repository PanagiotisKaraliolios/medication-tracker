import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { type ColorScheme, gradients, borderRadius, shadows } from '../components/ui/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useBatteryOptimization } from '../hooks/useBatteryOptimization';
import Toast from 'react-native-toast-message';

export default function NotificationSettingsScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  // ── Notification permission state ──
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const checkPermission = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionGranted(status === 'granted');
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const handleRequestPermission = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
      Toast.show({ type: 'success', text1: 'Notifications enabled' });
    } else {
      // Permission denied — must open system settings
      Linking.openSettings();
    }
  }, []);

  // ── Battery optimization (Android only) ──
  const {
    isOptimizationEnabled,
    isChecked: batteryChecked,
    isAndroid,
    openBatterySettings,
  } = useBatteryOptimization();

  // ── Scheduled notification count ──
  const [scheduledCount, setScheduledCount] = useState<number>(0);

  useEffect(() => {
    Notifications.getAllScheduledNotificationsAsync()
      .then((notifs) => setScheduledCount(notifs.length))
      .catch(() => setScheduledCount(0));
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
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Configure how and when you receive medication reminders
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Push Notifications ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="bell" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Push Notifications</Text>
          </View>

          <View style={styles.card}>
            {/* Permission toggle */}
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Feather name="bell" size={20} color={c.teal} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Allow Notifications</Text>
                <Text style={styles.settingSubtitle}>
                  {permissionGranted === null
                    ? 'Checking...'
                    : permissionGranted
                      ? 'Notifications are enabled'
                      : 'Required for medication reminders'}
                </Text>
              </View>
              <Switch
                value={permissionGranted === true}
                onValueChange={() => {
                  if (permissionGranted) {
                    // Can't revoke programmatically — send to system settings
                    Linking.openSettings();
                  } else {
                    handleRequestPermission();
                  }
                }}
                trackColor={{ false: c.gray300, true: `${c.teal}80` }}
                thumbColor={permissionGranted ? c.teal : c.gray400}
              />
            </View>

            <View style={styles.divider} />

            {/* Scheduled reminders info */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.7}
              onPress={() => router.push('/notifications')}
            >
              <View style={styles.settingIcon}>
                <Feather name="clock" size={20} color={c.teal} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Scheduled Reminders</Text>
                <Text style={styles.settingSubtitle}>
                  {scheduledCount === 0
                    ? 'No reminders scheduled'
                    : `${scheduledCount} active reminder${scheduledCount !== 1 ? 's' : ''}`}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={c.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Battery Optimization (Android only) ── */}
        {isAndroid && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="battery-charging" size={18} color={c.gray600} />
              <Text style={styles.sectionTitle}>Background Activity</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View
                  style={[
                    styles.settingIcon,
                    {
                      backgroundColor: isOptimizationEnabled
                        ? `${c.warning}15`
                        : `${c.success}15`,
                    },
                  ]}
                >
                  <Feather
                    name="battery"
                    size={20}
                    color={isOptimizationEnabled ? c.warning : c.success}
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Battery Optimization</Text>
                  <Text style={styles.settingSubtitle}>
                    {!batteryChecked
                      ? 'Checking...'
                      : isOptimizationEnabled
                        ? 'Restricted — reminders may be delayed'
                        : 'Unrestricted — reminders will arrive on time'}
                  </Text>
                </View>
                {batteryChecked && isOptimizationEnabled && (
                  <View style={[styles.statusBadge, { backgroundColor: c.warningLight }]}>
                    <Text style={[styles.statusBadgeText, { color: c.warning }]}>
                      Restricted
                    </Text>
                  </View>
                )}
                {batteryChecked && !isOptimizationEnabled && (
                  <View style={[styles.statusBadge, { backgroundColor: c.successLight }]}>
                    <Text style={[styles.statusBadgeText, { color: c.success }]}>
                      OK
                    </Text>
                  </View>
                )}
              </View>

              {/* Show fix button when restricted */}
              {batteryChecked && isOptimizationEnabled && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.warningBanner}>
                    <Feather name="alert-triangle" size={16} color={c.warning} />
                    <Text style={styles.warningText}>
                      Android may delay or silence your reminders to save battery.
                      Allow unrestricted background activity so notifications arrive on time.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.fixButton, { backgroundColor: c.teal }]}
                    activeOpacity={0.7}
                    onPress={openBatterySettings}
                  >
                    <Feather name="settings" size={16} color={c.white} />
                    <Text style={styles.fixButtonText}>Allow Unrestricted</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Success message when unrestricted */}
              {batteryChecked && !isOptimizationEnabled && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.successBanner}>
                    <Feather name="check-circle" size={16} color={c.success} />
                    <Text style={styles.successText}>
                      Background activity is unrestricted. Your reminders will be delivered
                      reliably.
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* ── Tips ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="info" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Tips</Text>
          </View>

          <View style={styles.card}>
            {([
              {
                icon: 'volume-2' as const,
                title: 'Keep your phone unmuted',
                desc: 'Notification sounds need your ringer to be on.',
              },
              {
                icon: 'moon' as const,
                title: 'Do Not Disturb',
                desc: "Reminders won't ring during DND unless you add an exception for MediTrack.",
              },
              {
                icon: 'wifi-off' as const,
                title: 'Works offline',
                desc: 'Scheduled reminders are stored locally and fire even without internet.',
              },
            ] as const).map((tip, i, arr) => (
              <React.Fragment key={tip.title}>
                <View style={styles.tipRow}>
                  <View style={styles.tipIcon}>
                    <Feather name={tip.icon} size={18} color={c.teal} />
                  </View>
                  <View style={styles.tipText}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipDesc}>{tip.desc}</Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
      paddingHorizontal: 24,
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
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${c.teal}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingText: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
    },
    settingSubtitle: {
      fontSize: 13,
      color: c.gray500,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: c.gray100,
      marginHorizontal: 16,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: `${c.warning}08`,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      color: c.gray600,
      lineHeight: 19,
    },
    fixButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginVertical: 12,
      paddingVertical: 12,
      borderRadius: borderRadius.md,
    },
    fixButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.white,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: `${c.success}08`,
    },
    successText: {
      flex: 1,
      fontSize: 13,
      color: c.gray600,
      lineHeight: 19,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      gap: 12,
    },
    tipIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${c.teal}10`,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    tipText: {
      flex: 1,
    },
    tipTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 2,
    },
    tipDesc: {
      fontSize: 13,
      color: c.gray500,
      lineHeight: 19,
    },
  });
}
