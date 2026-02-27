import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { MedicationCard } from '../../components/ui/MedicationCard';
import { AlertDialog } from '../../components/ui/AlertDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { CalendarSection } from '../../components/ui/CalendarSection';
import { type ColorScheme, gradients, shadows } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useCalendar } from '../../hooks/useCalendar';
import { useSnooze } from '../../hooks/useSnooze';
import {
  useMedications,
  useSchedules,
  useDoseLogsByDate,
  useDoseLogsByRange,
  useLogDose,
  useDeleteDoseLog,
  useAdjustSupply,
} from '../../hooks/useQueryHooks';
import { queryKeys } from '../../lib/queryKeys';
import { toISO } from '../../utils/date';
import { buildTodayDoses, type TodayDose } from '../../utils/dose';
import { computeDayStatusMap } from '../../utils/calendar';
import { formatTimeLeft } from '../../utils/snooze';

// ─ Component ───────────────────────────────────────────────────────

export default function TodayDashboard() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const queryClient = useQueryClient();

  const calendar = useCalendar();
  const { selectedISO, selectedDayLabel, todayISO, isToday, dateStr } = calendar;

  // ── Data queries ──

  const { data: medications = [], isLoading: medsLoading, error: medsError } = useMedications();
  const { data: schedules = [], isLoading: schLoading, error: schError } = useSchedules();
  const { data: doseLogs = [], isLoading: logsLoading, error: logsError } = useDoseLogsByDate(selectedISO);

  // Day status range (covers both week strip and expanded month)
  const { rangeStartISO, rangeEndISO } = useMemo(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 3);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 3);

    const monthStart = new Date(calendar.selectedDate.getFullYear(), calendar.selectedDate.getMonth(), 1);
    const monthEnd = new Date(calendar.selectedDate.getFullYear(), calendar.selectedDate.getMonth() + 1, 0);

    const rangeStart = weekStart < monthStart ? weekStart : monthStart;
    const rangeEnd = weekEnd > monthEnd ? weekEnd : monthEnd;
    return { rangeStartISO: toISO(rangeStart), rangeEndISO: toISO(rangeEnd) };
  }, [calendar.selectedDate, todayISO]);

  const { data: rangeLogs = [] } = useDoseLogsByRange(rangeStartISO, rangeEndISO);

  // ── Mutations ──

  const logDoseMut = useLogDose();
  const deleteDoseLogMut = useDeleteDoseLog();
  const adjustSupplyMut = useAdjustSupply();

  // ── Derived state ──

  const loading = medsLoading || schLoading || logsLoading;
  const error = medsError ?? schError ?? logsError;
  const hasMedications = medications.length > 0;

  const computedDoses = useMemo(
    () => buildTodayDoses(medications, schedules, doseLogs, selectedDayLabel, selectedISO),
    [medications, schedules, doseLogs, selectedDayLabel, selectedISO],
  );

  const [doses, setDoses] = useState<TodayDose[]>([]);

  useEffect(() => {
    setDoses(computedDoses);
  }, [computedDoses]);

  const dayStatusMap = useMemo(
    () => computeDayStatusMap(rangeStartISO, rangeEndISO, medications, schedules, rangeLogs),
    [rangeStartISO, rangeEndISO, medications, schedules, rangeLogs],
  );

  // ── Dose actions ──

  const handleStatusChange = useCallback(
    async (dose: TodayDose, newStatus: 'taken' | 'skipped') => {
      setDoses((prev) => prev.map((d) => (d.key === dose.key ? { ...d, status: newStatus } : d)));

      try {
        const data = await logDoseMut.mutateAsync({
          scheduleId: dose.scheduleId,
          medicationId: dose.medicationId,
          date: selectedISO,
          timeLabel: dose.timeLabel,
          status: newStatus,
        });

        setDoses((prev) => prev.map((d) => (d.key === dose.key ? { ...d, doseLogId: data.id } : d)));

        if (newStatus === 'taken') {
          adjustSupplyMut.mutate({ medicationId: dose.medicationId, delta: -dose.dosagePerDose });
        }
      } catch {
        setDoses((prev) => prev.map((d) => (d.key === dose.key ? { ...d, status: 'pending', doseLogId: null } : d)));
      }
    },
    [logDoseMut, adjustSupplyMut, selectedISO],
  );

  const handleUndo = useCallback(
    async (dose: TodayDose) => {
      if (!dose.doseLogId) return;
      const prevStatus = dose.status;
      setDoses((prev) => prev.map((d) => (d.key === dose.key ? { ...d, status: 'pending', doseLogId: null } : d)));

      try {
        await deleteDoseLogMut.mutateAsync(dose.doseLogId);
        if (prevStatus === 'taken') {
          adjustSupplyMut.mutate({ medicationId: dose.medicationId, delta: dose.dosagePerDose });
        }
      } catch {
        setDoses((prev) => prev.map((d) => (d.key === dose.key ? { ...d, status: prevStatus, doseLogId: dose.doseLogId } : d)));
      }
    },
    [deleteDoseLogMut, adjustSupplyMut],
  );

  // ── Snooze adapters ──

  const logDoseAdapter = useCallback(
    async (scheduleId: string, medicationId: string, date: string, timeLabel: string, status: 'taken' | 'skipped') => {
      try {
        const data = await logDoseMut.mutateAsync({ scheduleId, medicationId, date, timeLabel, status });
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

  const doseAmount = (dose: TodayDose) =>
    `${dose.dosagePerDose} ${dose.form}${dose.dosagePerDose !== 1 ? 's' : ''}`;

  // ── Dose sections config ──

  const doseSections = [
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
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
            <TouchableOpacity
              style={styles.notifButton}
              activeOpacity={0.7}
              onPress={() => router.push('/notifications')}
            >
              <Feather name="bell" size={22} color={c.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.progressSection}>
            <ProgressRing percentage={completionPct} size={120} strokeWidth={12} />
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
            <ErrorState title="Couldn't load schedule" message={error.message} onRetry={() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.medications.all });
              queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
              queryClient.invalidateQueries({ queryKey: queryKeys.doseLogs.all });
            }} />
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
          {!loading &&
            !error &&
            doseSections.map(
              (section) =>
                section.data.length > 0 && (
                  <View key={section.key} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {section.data.map((dose) => (
                      <View key={dose.key} style={section.key !== 'next' ? { marginBottom: 12 } : undefined}>
                        {section.renderCard(dose)}
                      </View>
                    ))}
                  </View>
                ),
            )}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>

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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fabWrapper}
        activeOpacity={0.85}
        onPress={() => router.push('/medication/select')}
      >
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Feather name="plus" size={28} color={c.white} />
        </LinearGradient>
      </TouchableOpacity>
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
    notifButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
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
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 16,
    },
    fabWrapper: {
      position: 'absolute',
      bottom: 24,
      right: 24,
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
