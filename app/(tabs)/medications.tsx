import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InventoryProgressBar } from '../../components/ui/InventoryProgressBar';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { type ColorScheme, gradients, borderRadius, shadows } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useMedication, type MedicationRow } from '../../contexts/MedicationContext';

export default function MedicationsScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { fetchMedications } = useMedication();
  const [medications, setMedications] = useState<MedicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMedications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await fetchMedications();
      if (err) throw new Error(err);
      setMedications(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  }, [fetchMedications]);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [loadMedications]),
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Medications</Text>
          <Text style={styles.headerSub}>Loading…</Text>
        </LinearGradient>
        <LoadingState message="Loading medications…" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Medications</Text>
        </LinearGradient>
        <ErrorState
          title="Couldn't load medications"
          message={error}
          onRetry={loadMedications}
        />
      </View>
    );
  }

  if (medications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyHeader} />
        <EmptyState
          variant="medications"
          actionLabel="Add Medication"
          onAction={() => router.push('/medication/add')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Medications</Text>
          <Text style={styles.headerSub}>{medications.length} active medications</Text>
        </LinearGradient>

        <View style={styles.content}>
          {medications.map((med) => {
            const isLow = med.current_supply <= (med.low_supply_threshold ?? 10);
            return (
              <TouchableOpacity
                key={med.id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/medication/${med.id}`)}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={styles.medDosage}>{med.dosage} · {med.form}</Text>
                  </View>
                  {isLow && (
                    <View style={styles.lowBadge}>
                      <Feather name="alert-triangle" size={14} color={c.warning} />
                      <Text style={styles.lowBadgeText}>Low</Text>
                    </View>
                  )}
                </View>

                <InventoryProgressBar current={med.current_supply} threshold={med.low_supply_threshold ?? 10} />

                <View style={styles.cardBottom}>
                  <View style={styles.nextDose}>
                    <Feather name="clock" size={14} color={c.gray500} />
                    <Text style={styles.nextDoseText}>{med.form}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={c.gray400} />
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fabWrapper}
        activeOpacity={0.85}
        onPress={() => router.push('/medication/add')}
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
    emptyHeader: {
      height: 100,
      backgroundColor: c.teal,
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 24,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: c.white,
    },
    headerSub: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      padding: 20,
      marginBottom: 16,
      ...shadows.md,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    cardInfo: {
      flex: 1,
    },
    medName: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 4,
    },
    medDosage: {
      fontSize: 14,
      color: c.gray500,
    },
    lowBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.warningLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.round,
    },
    lowBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.warning,
    },
    cardBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    nextDose: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    nextDoseText: {
      fontSize: 14,
      color: c.gray500,
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
