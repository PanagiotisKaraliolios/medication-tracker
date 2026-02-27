import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useState, useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { type ColorScheme, gradients, borderRadius, shadows } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useMedications, useSchedules, useDoseLogsByRange } from '../../hooks/useQueryHooks';
import { queryKeys } from '../../lib/queryKeys';
import { PERIOD_DAYS, PERIOD_OPTIONS } from '../../constants/reports';
import { toISO } from '../../utils/date';
import { buildReport } from '../../utils/report';

// ─── Component ───────────────────────────────────────────────────────

export default function ReportsScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const queryClient = useQueryClient();

  const [period, setPeriod] = useState('30 Days');

  // ── Date range for the selected period ──

  const { startISO, endISO, days } = useMemo(() => {
    const d = PERIOD_DAYS[period] ?? 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - d + 1);
    return { startISO: toISO(startDate), endISO: toISO(endDate), days: d };
  }, [period]);

  // ── Queries ──

  const { data: medications = [], isLoading: medsLoading, error: medsError } = useMedications();
  const { data: schedules = [], isLoading: schLoading, error: schError } = useSchedules();
  const { data: doseLogs = [], isLoading: logsLoading, error: logsError } = useDoseLogsByRange(startISO, endISO);

  const loading = medsLoading || schLoading || logsLoading;
  const error = medsError ?? schError ?? logsError;

  // ── Computed report data ──

  const { adherence, totalDoses, takenDoses, missedDoses, skippedDoses, chartBars, recentMissed } = useMemo(
    () => buildReport(startISO, endISO, medications, schedules, doseLogs, days),
    [startISO, endISO, medications, schedules, doseLogs, days],
  );

  // ── Header (always shown) ──

  const renderHeader = (children?: React.ReactNode) => (
    <LinearGradient
      colors={[...gradients.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <Text style={styles.headerTitle}>Reports</Text>
      {children}
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <LoadingState message="Loading reports…" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <ErrorState
          title="Couldn't load reports"
          message={error.message}
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.medications.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.doseLogs.all });
          }}
        />
      </View>
    );
  }

  if (totalDoses === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <EmptyState variant="reports" />
      </View>
    );
  }

  const maxBar = Math.max(...chartBars.map((b) => b.total), 1);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gradient header with adherence */}
        {renderHeader(
          <View style={styles.adherenceRow}>
            <Text style={styles.adherenceNum}>{adherence}%</Text>
            <Text style={styles.adherenceLabel}>Adherence</Text>
          </View>,
        )}

        <View style={styles.content}>
          {/* Period selector */}
          <SegmentedControl
            options={[...PERIOD_OPTIONS]}
            selected={period}
            onChange={setPeriod}
          />

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {([
              { icon: 'check-circle' as const, color: c.success, value: takenDoses, label: 'Taken' },
              { icon: 'skip-forward' as const, color: c.warning, value: skippedDoses, label: 'Skipped' },
              { icon: 'x-circle' as const, color: c.error, value: missedDoses, label: 'Missed' },
              { icon: 'calendar' as const, color: c.blue, value: totalDoses, label: 'Total' },
            ]).map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Feather name={s.icon} size={24} color={s.color} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Doses Taken</Text>
            <View style={styles.chartContainer}>
              {chartBars.map((item, i) => {
                const height = maxBar > 0 ? (item.taken / maxBar) * 100 : 0;
                return (
                  <View key={`${item.label}-${i}`} style={styles.barContainer}>
                    <Text style={styles.barCount}>{item.taken}</Text>
                    <View style={styles.barTrack}>
                      <LinearGradient
                        colors={[...gradients.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.barFill, { height: `${Math.max(height, 2)}%` }]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Recently Missed */}
          {recentMissed.length > 0 && (
            <View style={styles.missedCard}>
              <Text style={styles.missedTitle}>Recently Missed</Text>
              {recentMissed.map((item, i) => (
                <View key={i} style={[styles.missedRow, i === recentMissed.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.missedDot} />
                  <View style={styles.missedInfo}>
                    <Text style={styles.missedMed}>{item.medName}</Text>
                    <Text style={styles.missedDate}>{item.dateLabel} · {item.timeLabel}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
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
      paddingTop: 60,
      paddingHorizontal: 24,
      paddingBottom: 32,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: c.white,
      marginBottom: 16,
    },
    adherenceRow: {
      alignItems: 'center',
    },
    adherenceNum: {
      fontSize: 48,
      fontWeight: '700',
      color: c.white,
    },
    adherenceLabel: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 24,
      gap: 20,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: '40%',
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      padding: 16,
      alignItems: 'center',
      gap: 6,
      ...shadows.sm,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: c.gray900,
    },
    statLabel: {
      fontSize: 13,
      color: c.gray500,
    },
    chartCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      padding: 20,
      ...shadows.sm,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 20,
    },
    chartContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 140,
    },
    barContainer: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    barCount: {
      fontSize: 11,
      fontWeight: '600',
      color: c.gray500,
    },
    barTrack: {
      width: 24,
      height: 100,
      backgroundColor: c.gray100,
      borderRadius: 12,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    barFill: {
      width: '100%',
      borderRadius: 12,
    },
    barLabel: {
      fontSize: 11,
      color: c.gray500,
      fontWeight: '500',
    },
    missedCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      padding: 20,
      ...shadows.sm,
    },
    missedTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 16,
    },
    missedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.gray100,
    },
    missedDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.error,
    },
    missedInfo: {
      flex: 1,
    },
    missedMed: {
      fontSize: 15,
      fontWeight: '500',
      color: c.gray900,
    },
    missedDate: {
      fontSize: 13,
      color: c.gray500,
      marginTop: 2,
    },
  });
}
