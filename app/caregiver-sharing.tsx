import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useMedications, useSchedules, useDoseLogsByRange } from '../hooks/useQueryHooks';
import { computeAdherence, computeStreak } from '../utils/adherence';
import { toISO } from '../utils/date';
import { capitalize } from '../utils/string';
import { type ColorScheme, gradients, borderRadius, shadows } from '../components/ui/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import Toast from 'react-native-toast-message';
import type { MedicationRow, ScheduleRow, DoseLogRow } from '../types/database';

const PERIOD_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
] as const;

function buildSummaryText(
  profileName: string | null,
  medications: MedicationRow[],
  schedules: ScheduleRow[],
  logs: DoseLogRow[],
  periodDays: number,
  startISO: string,
  endISO: string,
): string {
  const adherence = computeAdherence(startISO, endISO, medications, schedules, logs);
  const streak = computeStreak(endISO, medications, schedules, logs);

  const takenCount = logs.filter((l) => l.status === 'taken').length;
  const skippedCount = logs.filter((l) => l.status === 'skipped').length;

  const name = profileName || 'A MediTrack user';
  const lines: string[] = [];

  lines.push('📋 MediTrack — Caregiver Summary');
  lines.push(`Shared by: ${name}`);
  lines.push(`Period: Last ${periodDays} days (${formatSimpleDate(startISO)} – ${formatSimpleDate(endISO)})`);
  lines.push(`Generated: ${formatSimpleDate(endISO)}`);
  lines.push('');

  lines.push('── Overview ──');
  lines.push(`Adherence: ${adherence}%`);
  lines.push(`Current streak: ${streak} day${streak !== 1 ? 's' : ''}`);
  lines.push(`Doses taken: ${takenCount}`);
  lines.push(`Doses skipped: ${skippedCount}`);
  lines.push('');

  lines.push(`── Medications (${medications.length}) ──`);
  for (const med of medications) {
    const medSchedules = schedules.filter((s) => s.medication_id === med.id);
    const supplyInfo =
      med.current_supply > 0 ? ` | Supply: ${med.current_supply} remaining` : '';
    lines.push(`• ${med.name} — ${med.dosage} (${capitalize(med.form)})${supplyInfo}`);

    for (const sched of medSchedules) {
      const freq =
        sched.frequency === 'interval' && sched.interval_days
          ? `Every ${sched.interval_days} days`
          : capitalize(sched.frequency);
      const times = sched.times_of_day.join(', ');
      const days =
        sched.frequency === 'weekly' && sched.selected_days.length > 0
          ? ` on ${sched.selected_days.join(', ')}`
          : '';
      const dose = sched.dosage_per_dose > 0 ? ` | ${sched.dosage_per_dose} per dose` : '';
      const instr = sched.instructions ? ` | ${sched.instructions}` : '';
      lines.push(`  Schedule: ${freq}${days} at ${times}${dose}${instr}`);
    }
  }

  if (medications.length === 0) {
    lines.push('No active medications.');
  }

  lines.push('');
  lines.push('— Sent from MediTrack');

  return lines.join('\n');
}

function formatSimpleDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CaregiverSharingScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { profileName } = useAuth();

  const [selectedPeriod, setSelectedPeriod] = useState(1); // default: 30 days
  const [sharing, setSharing] = useState(false);

  const periodDays = PERIOD_OPTIONS[selectedPeriod].days;

  const { todayISO, startISO } = useMemo(() => {
    const now = new Date();
    const tISO = toISO(now);
    const start = new Date(now);
    start.setDate(start.getDate() - (periodDays - 1));
    return { todayISO: tISO, startISO: toISO(start) };
  }, [periodDays]);

  const { data: medications = [] } = useMedications();
  const { data: schedules = [] } = useSchedules();
  const { data: logs = [] } = useDoseLogsByRange(startISO, todayISO);

  const adherence = useMemo(
    () => computeAdherence(startISO, todayISO, medications, schedules, logs),
    [startISO, todayISO, medications, schedules, logs],
  );
  const streak = useMemo(
    () => computeStreak(todayISO, medications, schedules, logs),
    [todayISO, medications, schedules, logs],
  );

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const text = buildSummaryText(
        profileName,
        medications,
        schedules,
        logs,
        periodDays,
        startISO,
        todayISO,
      );

      await Share.share({
        message: text,
        title: 'MediTrack — Caregiver Summary',
      });

      Toast.show({ type: 'success', text1: 'Summary shared' });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Share failed',
        text2: 'Could not share the summary',
      });
    } finally {
      setSharing(false);
    }
  }, [profileName, medications, schedules, logs, periodDays, startISO, todayISO]);

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
          <Text style={styles.headerTitle}>Caregiver Sharing</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Share a medication summary with family or caregivers
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Period selector ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="calendar" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Time Period</Text>
          </View>

          <View style={styles.periodRow}>
            {PERIOD_OPTIONS.map((opt, i) => {
              const isActive = selectedPeriod === i;
              return (
                <TouchableOpacity
                  key={opt.days}
                  style={[styles.periodChip, isActive && styles.periodChipActive]}
                  onPress={() => setSelectedPeriod(i)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.periodChipText,
                      isActive && styles.periodChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Preview ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="eye" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Summary Preview</Text>
          </View>

          <View style={styles.card}>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{adherence}%</Text>
                <Text style={styles.statLabel}>Adherence</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{medications.length}</Text>
                <Text style={styles.statLabel}>Medications</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Medication list */}
            {medications.length > 0 ? (
              medications.map((med, i) => {
                const medSchedules = schedules.filter(
                  (s) => s.medication_id === med.id,
                );
                return (
                  <React.Fragment key={med.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <View style={styles.medRow}>
                      <View style={styles.medIcon}>
                        <Feather name="heart" size={16} color={c.teal} />
                      </View>
                      <View style={styles.medInfo}>
                        <Text style={styles.medName}>{med.name}</Text>
                        <Text style={styles.medDetail}>
                          {med.dosage} — {capitalize(med.form)}
                          {med.current_supply > 0
                            ? ` — ${med.current_supply} left`
                            : ''}
                        </Text>
                        {medSchedules.map((sched) => {
                          const freq =
                            sched.frequency === 'interval' && sched.interval_days
                              ? `Every ${sched.interval_days} days`
                              : capitalize(sched.frequency);
                          return (
                            <Text key={sched.id} style={styles.schedDetail}>
                              {freq} at {sched.times_of_day.join(', ')}
                            </Text>
                          );
                        })}
                      </View>
                    </View>
                  </React.Fragment>
                );
              })
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No active medications</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── What's included ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="info" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>What's Included</Text>
          </View>

          <View style={styles.card}>
            {[
              { icon: 'activity' as const, text: 'Adherence rate and streak' },
              { icon: 'list' as const, text: 'Active medications with dosages' },
              { icon: 'clock' as const, text: 'Schedules and instructions' },
              { icon: 'package' as const, text: 'Current supply levels' },
            ].map((item, i) => (
              <React.Fragment key={item.text}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.includeRow}>
                  <Feather name={item.icon} size={16} color={c.teal} />
                  <Text style={styles.includeText}>{item.text}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Share button ── */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButtonGradient}
          >
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="share-2" size={20} color="#fff" />
                <Text style={styles.shareButtonText}>Share Summary</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Only the summary above is shared — no login credentials or personal
          health identifiers are included.
        </Text>

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
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.gray200,
      marginHorizontal: 16,
    },

    /* ── Period chips ── */
    periodRow: {
      flexDirection: 'row',
      gap: 10,
    },
    periodChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: borderRadius.lg,
      backgroundColor: c.card,
      alignItems: 'center',
      ...shadows.sm,
    },
    periodChipActive: {
      backgroundColor: c.teal,
    },
    periodChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.gray500,
    },
    periodChipTextActive: {
      color: c.white,
    },

    /* ── Stats ── */
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: c.teal,
    },
    statLabel: {
      fontSize: 11,
      color: c.gray500,
      marginTop: 2,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 32,
      backgroundColor: c.gray200,
    },

    /* ── Med rows ── */
    medRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    medIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${c.teal}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    medInfo: {
      flex: 1,
    },
    medName: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray900,
    },
    medDetail: {
      fontSize: 12,
      color: c.gray500,
      marginTop: 2,
    },
    schedDetail: {
      fontSize: 12,
      color: c.gray400,
      marginTop: 2,
    },
    emptyRow: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: c.gray400,
    },

    /* ── Includes ── */
    includeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    includeText: {
      fontSize: 14,
      color: c.gray700,
    },

    /* ── Share button ── */
    shareButton: {
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      marginBottom: 12,
    },
    shareButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
    },
    shareButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
    },

    /* ── Disclaimer ── */
    disclaimer: {
      fontSize: 12,
      color: c.gray400,
      textAlign: 'center',
      paddingHorizontal: 20,
      lineHeight: 18,
    },
  });
}
