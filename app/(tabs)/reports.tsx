import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import {
  type DimensionValue,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AdBanner } from '../../components/ui/AdBanner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LoadingState } from '../../components/ui/LoadingState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import {
  borderRadius,
  type ColorScheme,
  gradients,
  shadows,
  tablet as tabletLayout,
} from '../../components/ui/theme';
import { PERIOD_DAYS, PERIOD_OPTIONS } from '../../constants/reports';
import {
  useDoseLogsByRange,
  useMedications,
  useSchedules,
  useSymptomsByRange,
} from '../../hooks/useQueryHooks';
import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { queryKeys } from '../../lib/queryKeys';
import { toISO } from '../../utils/date';
import { buildReport } from '../../utils/report';
import { buildSymptomSummary } from '../../utils/symptom';

// ─── Component ───────────────────────────────────────────────────────

export default function ReportsScreen() {
  const c = useThemeColors();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => makeStyles(c, isTablet), [c, isTablet]);
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
  } = useDoseLogsByRange(startISO, endISO);
  const { data: symptoms = [] } = useSymptomsByRange(startISO, endISO);

  const loading = medsLoading || schLoading || logsLoading;
  const error = medsError ?? schError ?? logsError;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMeds(), refetchSchedules(), refetchLogs()]);
    setRefreshing(false);
  }, [refetchMeds, refetchSchedules, refetchLogs]);

  // ── Computed report data ──

  const { adherence, totalDoses, takenDoses, missedDoses, skippedDoses, chartBars, recentMissed } =
    useMemo(
      () => buildReport(startISO, endISO, medications, schedules, doseLogs, days),
      [startISO, endISO, medications, schedules, doseLogs, days],
    );

  const symptomSummary = useMemo(() => buildSymptomSummary(symptoms), [symptoms]);

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
        {/* Gradient header with adherence */}
        {renderHeader(
          <View style={styles.adherenceRow}>
            <Text style={styles.adherenceNum}>{adherence}%</Text>
            <Text style={styles.adherenceLabel}>Adherence</Text>
          </View>,
        )}

        <View style={styles.content}>
          {/* Period selector */}
          <SegmentedControl options={[...PERIOD_OPTIONS]} selected={period} onChange={setPeriod} />

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {[
              {
                icon: 'check-circle' as const,
                color: c.success,
                value: takenDoses,
                label: 'Taken',
              },
              {
                icon: 'skip-forward' as const,
                color: c.warning,
                value: skippedDoses,
                label: 'Skipped',
              },
              { icon: 'x-circle' as const, color: c.error, value: missedDoses, label: 'Missed' },
              { icon: 'calendar' as const, color: c.blue, value: totalDoses, label: 'Total' },
            ].map((s) => (
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
              {chartBars.map((item) => {
                const height = maxBar > 0 ? (item.taken / maxBar) * 100 : 0;
                return (
                  <View key={item.label} style={styles.barContainer}>
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

          {/* Bottom sections: side-by-side on tablet */}
          <View style={styles.bottomSections}>
            {/* Recently Missed */}
            {recentMissed.length > 0 && (
              <View style={[styles.missedCard, isTablet && styles.bottomSectionItem]}>
                <Text style={styles.missedTitle}>Recently Missed</Text>
                {recentMissed.map((item, i) => (
                  <View
                    key={`${item.dateLabel}-${item.medName}-${item.timeLabel}`}
                    style={[
                      styles.missedRow,
                      i === recentMissed.length - 1 && styles.missedRowLast,
                    ]}
                  >
                    <View style={styles.missedDot} />
                    <View style={styles.missedInfo}>
                      <Text style={styles.missedMed}>{item.medName}</Text>
                      <Text style={styles.missedDate}>
                        {item.dateLabel} · {item.timeLabel}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Symptom Summary */}
            {symptomSummary.totalCount > 0 && (
              <View style={[styles.missedCard, isTablet && styles.bottomSectionItem]}>
                <Text style={styles.missedTitle}>Symptoms Reported</Text>
                <View style={styles.symptomStatsRow}>
                  <View style={styles.symptomStatItem}>
                    <Text style={styles.symptomStatValue}>{symptomSummary.totalCount}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                  {symptomSummary.severityBreakdown.severe > 0 && (
                    <View style={styles.symptomStatItem}>
                      <Text style={[styles.symptomStatValue, styles.severityError]}>
                        {symptomSummary.severityBreakdown.severe}
                      </Text>
                      <Text style={styles.statLabel}>Severe</Text>
                    </View>
                  )}
                  {symptomSummary.severityBreakdown.moderate > 0 && (
                    <View style={styles.symptomStatItem}>
                      <Text style={[styles.symptomStatValue, styles.severityWarning]}>
                        {symptomSummary.severityBreakdown.moderate}
                      </Text>
                      <Text style={styles.statLabel}>Moderate</Text>
                    </View>
                  )}
                  {symptomSummary.severityBreakdown.mild > 0 && (
                    <View style={styles.symptomStatItem}>
                      <Text style={[styles.symptomStatValue, styles.severityMild]}>
                        {symptomSummary.severityBreakdown.mild}
                      </Text>
                      <Text style={styles.statLabel}>Mild</Text>
                    </View>
                  )}
                </View>
                <View style={styles.symptomChipsRow}>
                  {symptomSummary.uniqueSymptoms.map((name) => {
                    const count = symptomSummary.symptomCounts.get(name) ?? 0;
                    const isMostFrequent = name === symptomSummary.mostFrequent;
                    return (
                      <View
                        key={name}
                        style={[
                          styles.symptomReportChip,
                          isMostFrequent && styles.symptomReportChipHighlight,
                        ]}
                      >
                        <Text
                          style={[
                            styles.symptomReportChipText,
                            isMostFrequent && styles.symptomReportChipTextHighlight,
                          ]}
                        >
                          {name}
                        </Text>
                        {count > 1 && (
                          <View
                            style={[
                              styles.symptomCountBadge,
                              isMostFrequent && styles.symptomCountBadgeHighlight,
                            ]}
                          >
                            <Text
                              style={[
                                styles.symptomCountText,
                                isMostFrequent && styles.symptomCountTextHighlight,
                              ]}
                            >
                              {count}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
          <View style={{ height: 80 }} />
        </View>
      </ScrollView>
      <AdBanner placement="reportsBanner" />
    </View>
  );
}

function makeStyles(c: ColorScheme, isTablet: boolean) {
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
      ...(isTablet && {
        maxWidth: tabletLayout.contentMaxWidth,
        alignSelf: 'center' as const,
        width: '100%' as const,
      }),
    },
    bottomSections: {
      ...(isTablet ? { flexDirection: 'row' as const, gap: 16 } : { gap: 20 }),
    },
    bottomSectionItem: {
      flex: 1,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: isTablet ? ('20%' as DimensionValue) : ('40%' as DimensionValue),
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
      height: isTablet ? 200 : 140,
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
      width: isTablet ? 48 : 24,
      height: isTablet ? 160 : 100,
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
    missedRowLast: {
      borderBottomWidth: 0,
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
    symptomStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 16,
    },
    symptomStatItem: {
      alignItems: 'center',
      gap: 4,
    },
    symptomStatValue: {
      fontSize: 22,
      fontWeight: '700',
      color: c.gray900,
    },
    severityError: {
      color: c.error,
    },
    severityWarning: {
      color: c.warning,
    },
    severityMild: {
      color: c.teal,
    },
    symptomChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    symptomReportChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: borderRadius.round,
      backgroundColor: c.gray100,
    },
    symptomReportChipHighlight: {
      backgroundColor: c.warningLight,
    },
    symptomReportChipText: {
      fontSize: 13,
      color: c.gray600,
      fontWeight: '500',
    },
    symptomReportChipTextHighlight: {
      color: c.warning,
      fontWeight: '600',
    },
    symptomCountBadge: {
      backgroundColor: c.gray200,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    symptomCountBadgeHighlight: {
      backgroundColor: c.warning,
    },
    symptomCountText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.gray500,
    },
    symptomCountTextHighlight: {
      color: '#fff',
    },
  });
}
