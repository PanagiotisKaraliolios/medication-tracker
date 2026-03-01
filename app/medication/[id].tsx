import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/ui/Button';
import { AlertDialog } from '../../components/ui/AlertDialog';
import { InventoryProgressBar } from '../../components/ui/InventoryProgressBar';
import { type ColorScheme, gradients, borderRadius, shadows } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useMedication as useMedicationQuery, useSchedulesByMedication, useDeleteMedication, useDeleteSchedule } from '../../hooks/useQueryHooks';
import { ICON_MAP, TIME_ICON_MAP } from '../../constants/icons';

export default function MedicationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { data: med, isLoading, refetch: refetchMed } = useMedicationQuery(id);
  const { data: schedules = [], refetch: refetchSchedules } = useSchedulesByMedication(id);
  const schedule = schedules.length > 0 ? schedules[0] : null;
  const deleteMedicationMut = useDeleteMedication();
  const deleteScheduleMut = useDeleteSchedule();

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [clearScheduleVisible, setClearScheduleVisible] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMed(), refetchSchedules()]);
    setRefreshing(false);
  }, [refetchMed, refetchSchedules]);

  if (isLoading || !med) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.teal} />
      </View>
    );
  }

  const featherIcon = ICON_MAP[med.icon] ?? 'package';

  const handleDelete = async () => {
    try {
      await deleteMedicationMut.mutateAsync(med.id);
      setDeleteVisible(false);
      router.replace('/(tabs)/medications');
    } catch (err) {
      // mutation error handled by TanStack Query
    }
  };

  const handleClearSchedule = async () => {
    if (!schedule) return;
    try {
      await deleteScheduleMut.mutateAsync(schedule.id);
      setClearScheduleVisible(false);
    } catch (err) {
      // mutation error handled by TanStack Query
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[c.teal]} tintColor={c.teal} />
        }
      >
        {/* Medication Header */}
        <View style={styles.headerCard}>
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.medIcon}
          >
            <Feather name={featherIcon} size={24} color={c.white} />
          </LinearGradient>
          <View style={styles.headerInfo}>
            <Text style={styles.medName}>{med.name}</Text>
            <Text style={styles.medDosage}>
              {med.dosage} · {med.form}
            </Text>
            {schedule && (
              <View style={styles.frequencyBadge}>
                <Text style={styles.frequencyText}>{schedule.frequency}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Inventory */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory</Text>
          <View style={styles.card}>
            <InventoryProgressBar
              current={med.current_supply}
              threshold={med.low_supply_threshold}
            />
          </View>
        </View>

        {/* Schedule */}
        {schedule && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.card}>
            {(schedule.times_of_day ?? []).map((tod, index) => (
              <View key={tod}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.scheduleRow}>
                  <View style={styles.scheduleIcon}>
                    <Feather
                      name={TIME_ICON_MAP[tod] ?? 'clock'}
                      size={18}
                      color={c.teal}
                    />
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleLabel}>{tod}</Text>
                  </View>
                  <View style={styles.pillBadge}>
                    <Text style={styles.pillBadgeText}>{schedule.dosage_per_dose} {schedule.dosage_per_dose === 1 ? 'pill' : 'pills'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
        )}

        {/* Notification Settings */}
        {schedule && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.statsRow}>
            {([
              { icon: 'bell' as const, label: 'Push', on: schedule.push_notifications, value: schedule.push_notifications ? 'On' : 'Off' },
              { icon: 'message-square' as const, label: 'SMS', on: schedule.sms_alerts, value: schedule.sms_alerts ? 'On' : 'Off' },
              { icon: 'clock' as const, label: 'Snooze', on: null, value: schedule.snooze_duration },
            ]).map((s) => (
              <View key={s.label} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.on === null ? c.tealLight : s.on ? c.successLight : c.errorLight }]}>
                  <Feather name={s.icon} size={18} color={s.on === null ? c.teal : s.on ? c.success : c.error} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={[styles.statNumber, { fontSize: 14 }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        </View>
        )}

        {/* Instructions */}
        {schedule?.instructions ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <View style={styles.card}>
              <View style={styles.instructionRow}>
                <Feather name="info" size={16} color={c.teal} />
                <Text style={styles.instructionText}>{schedule.instructions}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* No Schedule hint */}
        {!schedule && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <View style={styles.card}>
              <Text style={{ fontSize: 14, color: c.gray500, textAlign: 'center', paddingVertical: 8 }}>
                No schedule set. Tap the + button on the Today tab to add one.
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {schedule && (
            <>
              <Button
                variant="secondary"
                onPress={() => {
                  router.push(`/medication/edit-schedule?id=${schedule.id}`);
                }}
              >
                Edit Schedule
              </Button>
              <View style={{ height: 12 }} />
            </>
          )}
          <Button
            variant="secondary"
            onPress={() => {
              router.push(`/medication/edit?id=${med.id}`);
            }}
          >
            Edit Medication
          </Button>
          {schedule && (
            <>
              <View style={{ height: 12 }} />
              <Button variant="destructive" onPress={() => setClearScheduleVisible(true)}>
                Clear Schedule
              </Button>
            </>
          )}
          <View style={{ height: 12 }} />
          <Button variant="destructive" onPress={() => setDeleteVisible(true)}>
            Delete Medication
          </Button>
        </View>
      </ScrollView>

      <AlertDialog
        visible={clearScheduleVisible}
        onClose={() => setClearScheduleVisible(false)}
        variant="warning"
        icon="calendar"
        title="Clear Schedule"
        message={`Remove the schedule for ${med.name}? The medication will remain in your list but will no longer appear on the Today tab.`}
        confirmLabel="Clear"
        cancelLabel="Cancel"
        onConfirm={handleClearSchedule}
        loading={deleteScheduleMut.isPending}
      />

      <AlertDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        variant="destructive"
        icon="trash-2"
        title="Delete Medication"
        message={`Are you sure you want to remove ${med.name} from your medications? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        loading={deleteMedicationMut.isPending}
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
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 40,
    },
    headerCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 24,
      ...shadows.md,
    },
    medIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: {
      flex: 1,
    },
    medName: {
      fontSize: 20,
      fontWeight: '700',
      color: c.gray900,
    },
    medDosage: {
      fontSize: 14,
      color: c.gray500,
      marginTop: 2,
    },
    frequencyBadge: {
      backgroundColor: c.tealLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.round,
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    frequencyText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.teal,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 12,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      ...shadows.sm,
    },
    divider: {
      height: 1,
      backgroundColor: c.gray100,
      marginVertical: 12,
    },
    scheduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    scheduleIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: c.tealLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scheduleInfo: {
      flex: 1,
    },
    scheduleLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
    },
    scheduleTime: {
      fontSize: 13,
      color: c.gray500,
      marginTop: 2,
    },
    pillBadge: {
      backgroundColor: c.gray100,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.round,
    },
    pillBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.gray600,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 14,
      alignItems: 'center',
      ...shadows.sm,
    },
    statIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '700',
      color: c.gray900,
    },
    statLabel: {
      fontSize: 12,
      color: c.gray500,
      marginTop: 2,
    },
    instructionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    instructionText: {
      fontSize: 14,
      color: c.gray600,
      flex: 1,
      lineHeight: 20,
    },
    actions: {
      marginTop: 8,
      marginBottom: 20,
    },
  });
}
