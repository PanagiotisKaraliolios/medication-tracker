import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  type DimensionValue,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AdBanner } from '../../components/ui/AdBanner';
import { AlertDialog } from '../../components/ui/AlertDialog';
import { CalendarSection } from '../../components/ui/CalendarSection';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { MedicationCard } from '../../components/ui/MedicationCard';
import { ProgressRing } from '../../components/ui/ProgressRing';
import {
  borderRadius,
  type ColorScheme,
  gradients,
  shadows,
  tablet as tabletLayout,
} from '../../components/ui/theme';
import { useCalendar } from '../../hooks/useCalendar';
import {
  useAdjustSupply,
  useDeleteDoseLog,
  useDeleteSymptom,
  useDeleteSymptomsByDate,
  useDoseLogsByDate,
  useDoseLogsByRange,
  useLogDose,
  useMedications,
  useSchedules,
  useSymptomsByDate,
} from '../../hooks/useQueryHooks';
import { useResponsive } from '../../hooks/useResponsive';
import { useSnooze } from '../../hooks/useSnooze';
import { useThemeColors } from '../../hooks/useThemeColors';
import { queryKeys } from '../../lib/queryKeys';
import { computeDayStatusMap } from '../../utils/calendar';
import { toISO } from '../../utils/date';
import { buildTodayDoses, type TodayDose } from '../../utils/dose';
import { formatTimeLeft } from '../../utils/snooze';

// ─ Component ───────────────────────────────────────────────────────

export default function TodayDashboard() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet, isLandscape } = useResponsive();
  const styles = useMemo(
    () => makeStyles(c, insets.bottom, isTablet),
    [c, insets.bottom, isTablet],
  );
  const queryClient = useQueryClient();

  const calendar = useCalendar();
  const { selectedISO, selectedDayLabel, todayISO, isToday, dateStr } = calendar;

  // ── Notification badge ──

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const [delivered, scheduled] = await Promise.all([
        Notifications.getPresentedNotificationsAsync(),
        Notifications.getAllScheduledNotificationsAsync(),
      ]);
      if (mounted) setHasNotifications(delivered.length > 0 || scheduled.length > 0);
    };
    check();
    const sub = Notifications.addNotificationReceivedListener(() => {
      if (mounted) setHasNotifications(true);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // ── Data queries ──

  const [hasNotifications, setHasNotifications] = useState(false);

  const {
    data: medications = [],
    isLoading: medsLoading,
    error: medsError,
    refetch: refetchMeds,
  } = useMedications();
  const {
    data: schedules = [],
    isLoading: schLoading,
    error: schError,
    refetch: refetchSchedules,
  } = useSchedules();
  const {
    data: doseLogs = [],
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useDoseLogsByDate(selectedISO);

  // Symptoms for today
  const {
    data: todaySymptoms = [],
    isLoading: symptomsLoading,
    error: symptomsError,
    refetch: refetchSymptoms,
  } = useSymptomsByDate(selectedISO);
  const deleteSymptom = useDeleteSymptom();
  const deleteSymptomsByDate = useDeleteSymptomsByDate();
  const [showClearSymptomsDialog, setShowClearSymptomsDialog] = useState(false);
  const [prnDeleteId, setPrnDeleteId] = useState<string | null>(null);

  // Day status range (covers both week strip and expanded month)
  const { rangeStartISO, rangeEndISO } = useMemo(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 3);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 3);

    const monthStart = new Date(
      calendar.selectedDate.getFullYear(),
      calendar.selectedDate.getMonth(),
      1,
    );
    const monthEnd = new Date(
      calendar.selectedDate.getFullYear(),
      calendar.selectedDate.getMonth() + 1,
      0,
    );

    const rangeStart = weekStart < monthStart ? weekStart : monthStart;
    const rangeEnd = weekEnd > monthEnd ? weekEnd : monthEnd;
    return { rangeStartISO: toISO(rangeStart), rangeEndISO: toISO(rangeEnd) };
  }, [calendar.selectedDate]);

  const { data: rangeLogs = [], refetch: refetchRangeLogs } = useDoseLogsByRange(
    rangeStartISO,
    rangeEndISO,
  );

  // ── Pull-to-refresh ──

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMeds(), refetchSchedules(), refetchLogs(), refetchRangeLogs()]);
    setRefreshing(false);
  }, [refetchMeds, refetchSchedules, refetchLogs, refetchRangeLogs]);

  // ── Mutations ──

  const logDoseMut = useLogDose();
  const deleteDoseLogMut = useDeleteDoseLog();
  const adjustSupplyMut = useAdjustSupply();

  // ── Derived state ──

  const loading = medsLoading || schLoading || logsLoading;
  const error = medsError ?? schError ?? logsError;
  const hasMedications = medications.length > 0;

  // PRN doses taken today
  const prnLogsToday = useMemo(() => {
    const prnLogs = doseLogs.filter((l) => l.schedule_id === null);
    return prnLogs.map((log) => {
      const med = medications.find((m) => m.id === log.medication_id);
      return {
        ...log,
        medName: med?.name ?? 'Unknown',
        medDosage: med?.dosage ?? '',
        medForm: med?.form ?? '',
      };
    });
  }, [doseLogs, medications]);

  const computedDoses = useMemo(
    () => buildTodayDoses(medications, schedules, doseLogs, selectedDayLabel, selectedISO),
    [medications, schedules, doseLogs, selectedDayLabel, selectedISO],
  );

  const [overrides, setOverrides] = useState<Record<string, Partial<TodayDose>>>({});
  const [fabOpen, setFabOpen] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  // Clear optimistic overrides when the selected date changes
  useEffect(() => {
    setOverrides({});
  }, [selectedISO]);

  const doses = useMemo(() => {
    if (Object.keys(overrides).length === 0) return computedDoses;
    return computedDoses.map((d) => {
      const ov = overrides[d.key];
      return ov ? { ...d, ...ov } : d;
    });
  }, [computedDoses, overrides]);

  const dayStatusMap = useMemo(
    () => computeDayStatusMap(rangeStartISO, rangeEndISO, medications, schedules, rangeLogs),
    [rangeStartISO, rangeEndISO, medications, schedules, rangeLogs],
  );

  // ── Dose actions ──

  const handleStatusChange = useCallback(
    async (dose: TodayDose, newStatus: 'taken' | 'skipped') => {
      setOverrides((prev) => ({ ...prev, [dose.key]: { status: newStatus } }));

      try {
        const data = await logDoseMut.mutateAsync({
          scheduleId: dose.scheduleId,
          medicationId: dose.medicationId,
          date: selectedISO,
          timeLabel: dose.timeLabel,
          status: newStatus,
        });

        setOverrides((prev) => ({
          ...prev,
          [dose.key]: { status: newStatus, doseLogId: data.id },
        }));

        if (newStatus === 'taken') {
          adjustSupplyMut.mutate({ medicationId: dose.medicationId, delta: -dose.dosagePerDose });
        }
      } catch {
        setOverrides((prev) => {
          const { [dose.key]: _, ...rest } = prev;
          return rest;
        });
      }
    },
    [logDoseMut, adjustSupplyMut, selectedISO],
  );

  const handleUndo = useCallback(
    async (dose: TodayDose) => {
      if (!dose.doseLogId) return;
      const prevOverride = overrides[dose.key];
      setOverrides((prev) => ({ ...prev, [dose.key]: { status: 'pending', doseLogId: null } }));

      try {
        await deleteDoseLogMut.mutateAsync(dose.doseLogId);
        if (dose.status === 'taken') {
          adjustSupplyMut.mutate({ medicationId: dose.medicationId, delta: dose.dosagePerDose });
        }
      } catch {
        setOverrides((prev) => ({
          ...prev,
          [dose.key]: prevOverride ?? {},
        }));
      }
    },
    [deleteDoseLogMut, adjustSupplyMut, overrides],
  );

  // ── Snooze adapters ──

  const logDoseAdapter = useCallback(
    async (
      scheduleId: string | null,
      medicationId: string,
      date: string,
      timeLabel: string,
      status: 'taken' | 'skipped',
    ) => {
      try {
        const data = await logDoseMut.mutateAsync({
          scheduleId,
          medicationId,
          date,
          timeLabel,
          status,
        });
        return { data, error: null };
      } catch (err: unknown) {
        return { data: null, error: err instanceof Error ? err.message : 'Failed to log dose' };
      }
    },
    [logDoseMut],
  );

  const adjustSupplyAdapter = useCallback(
    (medicationId: string, delta: number) => {
      adjustSupplyMut.mutate({ medicationId, delta });
    },
    [adjustSupplyMut],
  );

  const refreshDoses = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.doseLogs.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.medications.all });
  }, [queryClient]);

  const snooze = useSnooze({
    selectedISO,
    loadDoses: refreshDoses,
    logDose: logDoseAdapter,
    adjustSupply: adjustSupplyAdapter,
    handleStatusChange,
  });

  // ── Derived data ──

  const takenCount = doses.filter((d) => d.status === 'taken').length;
  const totalCount = doses.length;
  const completionPct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  const pendingDoses = doses.filter((d) => d.status === 'pending' && !snooze.snoozedUntil[d.key]);
  const snoozedDoses = doses.filter((d) => d.status === 'pending' && !!snooze.snoozedUntil[d.key]);
  const completedDoses = doses.filter((d) => d.status !== 'pending');

  // ── Dose card helper ──

  const doseAmount = useCallback(
    (dose: TodayDose) => `${dose.dosagePerDose} ${dose.form}${dose.dosagePerDose !== 1 ? 's' : ''}`,
    [],
  );

  // ── Dose sections config ──

  const doseSections = useMemo(
    () => [
      {
        key: 'next',
        title: 'Next Dose',
        data: pendingDoses.slice(0, 1),
        renderCard: (dose: TodayDose) => (
          <MedicationCard
            name={dose.name}
            strength={dose.dosage}
            doseAmount={doseAmount(dose)}
            time={dose.time}
            status="pending"
            onTake={() => handleStatusChange(dose, 'taken')}
            onSkip={() => handleStatusChange(dose, 'skipped')}
            onSnooze={() => snooze.handleSnoozeRequest(dose)}
          />
        ),
      },
      {
        key: 'upcoming',
        title: 'Upcoming',
        data: pendingDoses.slice(1),
        renderCard: (dose: TodayDose) => (
          <MedicationCard
            name={dose.name}
            strength={dose.dosage}
            doseAmount={doseAmount(dose)}
            time={dose.time}
            status="pending"
            onTake={() => handleStatusChange(dose, 'taken')}
            onSkip={() => handleStatusChange(dose, 'skipped')}
            onSnooze={() => snooze.handleSnoozeRequest(dose)}
          />
        ),
      },
      {
        key: 'snoozed',
        title: 'Snoozed',
        data: snoozedDoses,
        renderCard: (dose: TodayDose) => {
          const remaining = (snooze.snoozedUntil[dose.key] ?? 0) - Date.now();
          return (
            <MedicationCard
              name={dose.name}
              strength={dose.dosage}
              doseAmount={doseAmount(dose)}
              time={dose.time}
              status="snoozed"
              snoozeTimeLeft={formatTimeLeft(remaining)}
              onTake={() => snooze.handleTakeSnoozed(dose)}
              onCancelSnooze={() => snooze.handleCancelSnooze(dose)}
            />
          );
        },
      },
      {
        key: 'completed',
        title: 'Completed',
        data: completedDoses,
        renderCard: (dose: TodayDose) => (
          <MedicationCard
            name={dose.name}
            strength={dose.dosage}
            doseAmount={doseAmount(dose)}
            time={dose.time}
            status={dose.status}
            onUndo={() => handleUndo(dose)}
          />
        ),
      },
    ],
    [
      pendingDoses,
      snoozedDoses,
      completedDoses,
      handleStatusChange,
      snooze,
      handleUndo,
      doseAmount,
    ],
  );

  const toggleFab = useCallback(() => {
    const opening = !fabOpen;
    setFabOpen(opening);
    if (opening) {
      Animated.spring(fabAnim, {
        toValue: 1,
        delay: 150,
        useNativeDriver: true,
        friction: 6,
      }).start();
    } else {
      Animated.timing(fabAnim, { toValue: 0, duration: 50, useNativeDriver: true }).start();
    }
  }, [fabOpen, fabAnim]);

  const handleFabAction = useCallback(
    (route: string) => {
      setFabOpen(false);
      Animated.timing(fabAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      router.push(route as Href);
    },
    [fabAnim],
  );

  const fabRotation = fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const fabActionsOpacity = fabAnim;
  const fabActionsTranslate = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[c.teal]}
            tintColor={c.teal}
          />
        }
      >
        {/* Gradient header */}
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{isToday ? 'Today' : dateStr}</Text>
              <Text style={styles.headerDate}>{isToday ? dateStr : 'Viewing another day'}</Text>
            </View>
            <View style={styles.headerButtons}>
              <Pressable
                style={styles.notifButton}
                onPress={() => router.push('/notifications')}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Feather name="bell" size={22} color={c.white} />
                {hasNotifications && <View style={styles.notifDot} />}
              </Pressable>
              <Pressable
                style={styles.notifButton}
                onPress={() => router.push('/symptoms')}
                accessibilityRole="button"
                accessibilityLabel="Symptoms"
              >
                <Feather name="activity" size={22} color={c.white} />
              </Pressable>
            </View>
          </View>

          <View style={styles.progressSection}>
            <ProgressRing
              percentage={completionPct}
              size={isTablet ? 140 : 120}
              strokeWidth={isTablet ? 14 : 12}
            />
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Daily Progress</Text>
              <Text style={styles.progressCount}>
                {takenCount} of {totalCount}
              </Text>
              <Text style={styles.progressSub}>medications taken</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Calendar */}
        <CalendarSection
          selectedISO={selectedISO}
          todayISO={todayISO}
          isToday={isToday}
          weekDays={calendar.weekDays}
          calendarExpanded={calendar.calendarExpanded}
          calendarHeight={calendar.calendarHeight}
          calendarOpacity={calendar.calendarOpacity}
          chevronRotation={calendar.chevronRotation}
          calendarViewMonth={calendar.calendarViewMonth}
          calendarViewYear={calendar.calendarViewYear}
          calendarDays={calendar.calendarDays}
          dayStatusMap={dayStatusMap}
          toggleCalendar={calendar.toggleCalendar}
          goMonth={calendar.goMonth}
          handleDaySelect={calendar.handleDaySelect}
          handleWeekDaySelect={calendar.handleWeekDaySelect}
          goToToday={calendar.goToToday}
        />

        <View style={styles.content}>
          {/* Loading state */}
          {loading && <LoadingState message="Loading today's schedule\u2026" />}

          {/* Error state */}
          {!loading && error && (
            <ErrorState
              title="Couldn't load schedule"
              message={error.message}
              onRetry={() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.medications.all });
                queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
                queryClient.invalidateQueries({ queryKey: queryKeys.doseLogs.all });
              }}
            />
          )}

          {/* Empty state — no medications at all */}
          {!loading && !error && doses.length === 0 && !hasMedications && (
            <EmptyState
              variant="schedule"
              title="No medications yet"
              message="Add a medication and set up a schedule to get started."
              actionLabel="Add Medication"
              onAction={() => router.push('/medication/add')}
            />
          )}

          {/* Empty state — has medications but no doses scheduled */}
          {!loading && !error && doses.length === 0 && hasMedications && (
            <EmptyState
              variant="schedule"
              title="No doses scheduled"
              message="None of your medications are scheduled for today. You can add a schedule to an existing medication."
              actionLabel="Schedule Medication"
              onAction={() => router.push('/medication/select')}
            />
          )}

          {/* Dose sections */}
          {!loading && !error && (
            <View style={isTablet && isLandscape ? styles.doseGrid : undefined}>
              {doseSections.map(
                (section) =>
                  section.data.length > 0 && (
                    <View
                      key={section.key}
                      style={[styles.section, isTablet && isLandscape && styles.doseGridItem]}
                    >
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      {section.data.map((dose) => (
                        <View
                          key={dose.key}
                          style={section.key !== 'next' ? styles.doseCardSpacing : undefined}
                        >
                          {section.renderCard(dose)}
                        </View>
                      ))}
                    </View>
                  ),
              )}
            </View>
          )}

          {/* As Needed (PRN) — taken today */}
          {!loading && !error && prnLogsToday.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>As Needed</Text>
              {prnLogsToday.map((log) => (
                <View key={log.id} style={styles.prnLogCard}>
                  <View style={styles.prnLogInfo}>
                    <Text style={styles.prnLogName}>{log.medName}</Text>
                    <Text style={styles.prnLogDetail}>
                      {log.medDosage} · {log.medForm}
                      {log.reason ? ` · ${log.reason}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.prnLogTime}>{log.time_label}</Text>
                  <Pressable
                    style={styles.prnDeleteBtn}
                    onPress={() => setPrnDeleteId(log.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${log.medName} PRN dose`}
                  >
                    <Feather name="trash-2" size={16} color={c.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Symptoms Today */}
          {!symptomsLoading && symptomsError && (
            <View style={styles.section}>
              <ErrorState message="Couldn't load symptoms" onRetry={refetchSymptoms} />
            </View>
          )}

          {!symptomsLoading && !symptomsError && todaySymptoms.length === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Symptoms Today</Text>
              <Text style={{ color: c.gray500, fontSize: 14, marginTop: 4 }}>
                No symptoms logged
              </Text>
            </View>
          )}

          {!symptomsLoading && !symptomsError && todaySymptoms.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Symptoms Today</Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {todaySymptoms.length > 1 && (
                    <Pressable
                      onPress={() => setShowClearSymptomsDialog(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Clear all symptoms"
                    >
                      <Text style={[styles.seeAllText, { color: c.error }]}>Clear All</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => router.push('/symptoms')}
                    accessibilityRole="button"
                    accessibilityLabel="See all symptoms"
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.symptomChips}>
                {todaySymptoms.slice(0, 5).map((s) => (
                  <Pressable
                    key={s.id}
                    style={[
                      styles.symptomChip,
                      s.severity === 'severe' && styles.symptomChipSevere,
                    ]}
                    onLongPress={async () => {
                      try {
                        await deleteSymptom.mutateAsync(s.id);
                        Toast.show({ type: 'success', text1: 'Symptom removed' });
                      } catch (err: unknown) {
                        Toast.show({
                          type: 'error',
                          text1: 'Failed to delete',
                          text2: err instanceof Error ? err.message : String(err),
                        });
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.name}, ${s.severity}. Long press to remove`}
                  >
                    <Text
                      style={[
                        styles.symptomChipText,
                        s.severity === 'severe' && styles.symptomChipTextSevere,
                      ]}
                    >
                      {s.name}
                    </Text>
                    <Feather
                      name="x"
                      size={12}
                      color={s.severity === 'severe' ? c.error : c.warning}
                    />
                  </Pressable>
                ))}
                {todaySymptoms.length > 5 && (
                  <View style={styles.symptomChip}>
                    <Text style={styles.symptomChipText}>+{todaySymptoms.length - 5} more</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={{ height: 160 }} />
        </View>
      </ScrollView>

      <AdBanner placement="todayBanner" />

      {/* Snooze Confirmation Dialog */}
      <AlertDialog
        visible={!!snooze.snoozeDialogDose}
        onClose={() => snooze.setSnoozeDialogDose(null)}
        title="Snooze Dose"
        message={
          snooze.snoozeDialogDose
            ? `Snooze ${snooze.snoozeDialogDose.name} (${snooze.snoozeDialogDose.dosage}) for ${snooze.snoozeDialogDose.snoozeDuration}? You'll be reminded when the snooze expires.`
            : ''
        }
        variant="info"
        icon="bell-off"
        confirmLabel="Snooze"
        cancelLabel="Cancel"
        onConfirm={snooze.handleSnoozeConfirm}
      />

      {/* Delete PRN Dose Dialog */}
      <AlertDialog
        visible={!!prnDeleteId}
        onClose={() => setPrnDeleteId(null)}
        title="Delete PRN Dose"
        message="Remove this dose log? This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={async () => {
          if (!prnDeleteId) return;
          try {
            await deleteDoseLogMut.mutateAsync(prnDeleteId);
            setPrnDeleteId(null);
            Toast.show({ type: 'success', text1: 'PRN dose removed' });
          } catch (err: unknown) {
            Toast.show({
              type: 'error',
              text1: 'Failed to delete',
              text2: err instanceof Error ? err.message : String(err),
            });
          }
        }}
      />

      {/* Clear All Symptoms Dialog */}
      <AlertDialog
        visible={showClearSymptomsDialog}
        onClose={() => setShowClearSymptomsDialog(false)}
        title="Clear All Symptoms"
        message={`Remove all ${todaySymptoms.length} symptom${todaySymptoms.length === 1 ? '' : 's'} logged for this day?`}
        variant="destructive"
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        onConfirm={async () => {
          try {
            await deleteSymptomsByDate.mutateAsync(selectedISO);
            setShowClearSymptomsDialog(false);
            Toast.show({ type: 'success', text1: 'All symptoms cleared' });
          } catch (err: unknown) {
            Toast.show({
              type: 'error',
              text1: 'Failed to clear',
              text2: err instanceof Error ? err.message : String(err),
            });
          }
        }}
      />

      {/* FAB Speed Dial */}
      <Animated.View
        style={[styles.fabBackdrop, { opacity: fabAnim }]}
        pointerEvents={fabOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={toggleFab} />
      </Animated.View>

      <Animated.View
        style={[
          styles.fabActions,
          { opacity: fabActionsOpacity, transform: [{ translateY: fabActionsTranslate }] },
        ]}
        pointerEvents={fabOpen ? 'auto' : 'none'}
      >
        <Pressable
          style={styles.fabActionRow}
          onPress={() => handleFabAction(`/log-symptom?date=${selectedISO}`)}
          accessibilityRole="button"
          accessibilityLabel="Log Symptom"
        >
          <View style={styles.fabActionLabel}>
            <Text style={styles.fabActionLabelText}>Log Symptom</Text>
          </View>
          <View style={[styles.fabActionIcon, { backgroundColor: c.warning }]}>
            <Feather name="activity" size={20} color={c.white} />
          </View>
        </Pressable>

        <Pressable
          style={styles.fabActionRow}
          onPress={() => handleFabAction('/medication/log-prn')}
          accessibilityRole="button"
          accessibilityLabel="Log PRN Dose"
        >
          <View style={styles.fabActionLabel}>
            <Text style={styles.fabActionLabelText}>Log PRN Dose</Text>
          </View>
          <View style={[styles.fabActionIcon, { backgroundColor: c.blue }]}>
            <Feather name="zap" size={20} color={c.white} />
          </View>
        </Pressable>

        <Pressable
          style={styles.fabActionRow}
          onPress={() => handleFabAction('/medication/add')}
          accessibilityRole="button"
          accessibilityLabel="Add Medication"
        >
          <View style={styles.fabActionLabel}>
            <Text style={styles.fabActionLabelText}>Add Medication</Text>
          </View>
          <View style={[styles.fabActionIcon, { backgroundColor: c.teal }]}>
            <Feather name="plus-circle" size={20} color={c.white} />
          </View>
        </Pressable>

        <Pressable
          style={styles.fabActionRow}
          onPress={() => handleFabAction('/medication/select')}
          accessibilityRole="button"
          accessibilityLabel="Schedule Medication"
        >
          <View style={styles.fabActionLabel}>
            <Text style={styles.fabActionLabelText}>Schedule Medication</Text>
          </View>
          <View style={[styles.fabActionIcon, { backgroundColor: c.teal }]}>
            <Feather name="calendar" size={20} color={c.white} />
          </View>
        </Pressable>
      </Animated.View>

      <Pressable
        style={styles.fabWrapper}
        onPress={toggleFab}
        accessibilityRole="button"
        accessibilityLabel={fabOpen ? 'Close actions menu' : 'Open actions menu'}
      >
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
            <Feather name="plus" size={28} color={c.white} />
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ColorScheme, bottomInset: number, isTablet: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      ...(isTablet && { paddingLeft: tabletLayout.sideRailWidth }),
    },
    header: {
      paddingTop: isTablet ? 24 : 60,
      paddingHorizontal: 24,
      paddingBottom: 32,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      ...(isTablet && {
        maxWidth: tabletLayout.contentMaxWidth,
        alignSelf: 'center' as const,
        width: '100%' as const,
      }),
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: c.white,
    },
    headerDate: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
    },
    headerButtons: {
      gap: 8,
    },
    notifButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    notifDot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#EF4444',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.3)',
    },
    progressSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 24,
    },
    progressInfo: {
      flex: 1,
    },
    progressLabel: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginBottom: 4,
    },
    progressCount: {
      fontSize: 32,
      fontWeight: '700',
      color: c.white,
    },
    progressSub: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 24,
      ...(isTablet && {
        maxWidth: tabletLayout.contentMaxWidth,
        alignSelf: 'center' as const,
        width: '100%' as const,
      }),
    },
    doseGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    doseGridItem: {
      width: '48%' as DimensionValue,
    },
    section: {
      marginBottom: 24,
    },
    doseCardSpacing: {
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 16,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.teal,
    },

    prnLogCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 14,
      marginBottom: 8,
      ...shadows.sm,
    },
    prnLogInfo: {
      flex: 1,
    },
    prnLogName: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
    },
    prnLogDetail: {
      fontSize: 13,
      color: c.gray500,
      marginTop: 2,
    },
    prnLogTime: {
      fontSize: 13,
      color: c.gray400,
      marginLeft: 12,
    },
    prnDeleteBtn: {
      marginLeft: 8,
      padding: 6,
    },

    symptomChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    symptomChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.round,
      backgroundColor: c.warningLight,
    },
    symptomChipSevere: {
      backgroundColor: c.errorLight,
    },
    symptomChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: c.warning,
    },
    symptomChipTextSevere: {
      color: c.error,
    },
    fabBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      zIndex: 90,
    },
    fabActions: {
      position: 'absolute',
      bottom: isTablet ? 100 : Math.max(90, bottomInset + 74) + 72,
      right: 24,
      alignItems: 'flex-end',
      gap: 12,
      zIndex: 100,
    },
    fabActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    fabActionLabel: {
      backgroundColor: c.card,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: borderRadius.lg,
      ...shadows.sm,
    },
    fabActionLabelText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray900,
    },
    fabActionIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...shadows.md,
    },
    fabWrapper: {
      position: 'absolute',
      bottom: isTablet ? 24 : Math.max(90, bottomInset + 74),
      right: 24,
      zIndex: 100,
    },
    fab: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.lg,
    },
  });
}
