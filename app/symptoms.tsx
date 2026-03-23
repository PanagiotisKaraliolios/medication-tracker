import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertDialog } from '../components/ui/AlertDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingState } from '../components/ui/LoadingState';
import { borderRadius, type ColorScheme, gradients, shadows } from '../components/ui/theme';
import { SEVERITY_CONFIG } from '../constants/symptoms';
import { useDeleteSymptom, useMedications, useSymptomsByRange } from '../hooks/useQueryHooks';
import { useThemeColors } from '../hooks/useThemeColors';
import type { SymptomRow } from '../types/database';
import { toISO } from '../utils/date';

export default function SymptomsScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);

  const { data: medications = [] } = useMedications();
  const deleteSymptomMut = useDeleteSymptom();

  // Last 30 days
  const { startISO, endISO } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { startISO: toISO(start), endISO: toISO(end) };
  }, []);

  const { data: symptoms = [], isLoading, error, refetch } = useSymptomsByRange(startISO, endISO);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const [deleteTarget, setDeleteTarget] = useState<SymptomRow | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSymptomMut.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      /* mutation handles error */
    }
  };

  const medMap = useMemo(() => new Map(medications.map((m) => [m.id, m.name])), [medications]);

  // Group symptoms by date
  const grouped = useMemo(() => {
    const map = new Map<string, SymptomRow[]>();
    for (const s of symptoms) {
      const list = map.get(s.logged_date) ?? [];
      list.push(s);
      map.set(s.logged_date, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [symptoms]);

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
            <Text style={styles.headerTitle}>Symptoms</Text>
          </View>
          <Text style={styles.headerSub}>{symptoms.length} recorded in the last 30 days</Text>
          <Text style={styles.headerTip}>Swipe right on an entry to delete</Text>
        </LinearGradient>

        <View style={styles.content}>
          {isLoading && <LoadingState message="Loading symptoms…" />}

          {!isLoading && error && (
            <ErrorState
              title="Couldn't load symptoms"
              message={error.message}
              onRetry={() => refetch()}
            />
          )}

          {!isLoading && !error && symptoms.length === 0 && (
            <EmptyState
              variant="medications"
              title="No symptoms logged"
              message="Track side effects and symptoms to share with your doctor."
              actionLabel="Log Symptom"
              onAction={() => router.push('/log-symptom')}
            />
          )}

          {!isLoading &&
            !error &&
            grouped.map(([date, items]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateLabel}>
                  {new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                {items.map((s) => {
                  const cfg = SEVERITY_CONFIG[s.severity];
                  return (
                    <SwipeableCard
                      key={s.id}
                      onDelete={() => setDeleteTarget(s)}
                      c={c}
                      styles={styles}
                    >
                      <View
                        style={[
                          styles.severityDot,
                          {
                            backgroundColor: s.severity === 'severe' ? c.error : c.warning,
                          },
                        ]}
                      />
                      <View style={styles.symptomInfo}>
                        <Text style={styles.symptomName}>{s.name}</Text>
                        <Text style={styles.symptomMeta}>
                          {cfg.label}
                          {s.medication_id && medMap.has(s.medication_id)
                            ? ` · ${medMap.get(s.medication_id)}`
                            : ''}
                        </Text>
                        {s.notes ? <Text style={styles.symptomNotes}>{s.notes}</Text> : null}
                      </View>
                      {s.logged_at && (
                        <Text style={styles.symptomTime}>
                          {new Date(s.logged_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Text>
                      )}
                    </SwipeableCard>
                  );
                })}
              </View>
            ))}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* FAB to log new symptom */}
      <TouchableOpacity
        style={[styles.fabWrapper, { bottom: Math.max(24, insets.bottom + 16) }]}
        activeOpacity={0.85}
        onPress={() => router.push('/log-symptom')}
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

      {/* Delete confirmation */}
      <AlertDialog
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        variant="destructive"
        icon="trash-2"
        title="Delete Symptom"
        message={deleteTarget ? `Remove "${deleteTarget.name}" from your log?` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        loading={deleteSymptomMut.isPending}
      />
    </View>
  );
}

const SWIPE_THRESHOLD = 64;

function SwipeableCard({
  children,
  onDelete,
  c,
  styles,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  c: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof makeStyles>;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  const deleteOpacity = translateX.interpolate({
    inputRange: [0, 40, SWIPE_THRESHOLD],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const deleteScale = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0.6, 1],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx > 0) translateX.setValue(Math.min(g.dx, SWIPE_THRESHOLD + 20));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: SWIPE_THRESHOLD,
            useNativeDriver: true,
            friction: 8,
          }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.swipeContainer}>
      <Animated.View style={[styles.deleteAction, { opacity: deleteOpacity }]}>
        <TouchableOpacity
          onPress={() => {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
            onDelete();
          }}
          activeOpacity={0.7}
          style={styles.deleteButton}
        >
          <Animated.View style={{ transform: [{ scale: deleteScale }] }}>
            <Feather name="trash-2" size={16} color={c.white} />
          </Animated.View>
          <Animated.Text style={[styles.deleteLabel, { transform: [{ scale: deleteScale }] }]}>
            Delete
          </Animated.Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        style={[styles.symptomCard, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
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
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: c.white,
      marginLeft: 12,
    },
    headerSub: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginLeft: 52,
    },
    headerTip: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.5)',
      marginLeft: 52,
      marginTop: 4,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    dateGroup: {
      marginBottom: 24,
    },
    dateLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray500,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    symptomCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      ...shadows.sm,
    },
    severityDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 5,
      marginRight: 12,
    },
    symptomInfo: {
      flex: 1,
    },
    symptomName: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
    },
    symptomMeta: {
      fontSize: 13,
      color: c.gray500,
      marginTop: 2,
    },
    symptomNotes: {
      fontSize: 13,
      color: c.gray500,
      fontStyle: 'italic',
      marginTop: 4,
    },
    symptomTime: {
      fontSize: 12,
      color: c.gray400,
      marginLeft: 8,
    },
    deleteAction: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      width: 56,
    },
    deleteButton: {
      width: 56,
      height: 56,
      backgroundColor: c.error,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    deleteLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: c.white,
    },
    swipeContainer: {
      marginBottom: 8,
      position: 'relative',
    },
    fabWrapper: {
      position: 'absolute',
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
