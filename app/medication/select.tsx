import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { type ColorScheme, borderRadius, shadows } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useMedication, type MedicationRow } from '../../contexts/MedicationContext';
import { ICON_MAP } from '../../constants/icons';

export default function SelectMedicationScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { fetchMedications, fetchSchedules, resetScheduleDraft, updateScheduleDraft, setSchedulingMedId } = useMedication();

  const [medications, setMedications] = useState<MedicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const filtered = useMemo(() => {
    if (!search.trim()) return medications;
    const q = search.toLowerCase();
    return medications.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.dosage.toLowerCase().includes(q) ||
        m.form.toLowerCase().includes(q),
    );
  }, [medications, search]);

  const handleSelect = async (med: MedicationRow) => {
    // Reset schedule draft, set the medication being scheduled
    resetScheduleDraft();
    setSchedulingMedId(med.id);

    // If an existing schedule exists, pre-populate the draft with its values
    const { data: schedules } = await fetchSchedules(med.id);
    if (schedules.length > 0) {
      const s = schedules[0]; // use the first (most recent) schedule
      updateScheduleDraft({
        frequency: s.frequency.charAt(0).toUpperCase() + s.frequency.slice(1),
        selectedDays: s.selected_days ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        timesOfDay: s.times_of_day ?? ['Morning'],
        dosagePerDose: s.dosage_per_dose ?? 1,
        pushNotifications: s.push_notifications,
        smsAlerts: s.sms_alerts,
        snoozeDuration: s.snooze_duration ?? '5 min',
        instructions: s.instructions ?? '',
      });
    }

    router.push('/medication/schedule');
  };

  const renderItem = ({ item }: { item: MedicationRow }) => {
    const featherIcon = ICON_MAP[item.icon] ?? 'disc';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.iconCircle}>
          <Feather name={featherIcon} size={22} color={c.teal} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.medName}>{item.name}</Text>
          <Text style={styles.medDetail}>
            {item.dosage} · {item.form}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={c.gray400} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <Feather name="search" size={18} color={c.gray400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search medications…"
          placeholderTextColor={c.gray400}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
            <Feather name="x-circle" size={18} color={c.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {loading && <LoadingState message="Loading medications…" />}

      {!loading && error && (
        <ErrorState
          title="Couldn't load medications"
          message={error}
          onRetry={loadMedications}
        />
      )}

      {!loading && !error && medications.length === 0 && (
        <EmptyState
          variant="medications"
          title="No medications yet"
          message="Add a medication first before setting up a schedule."
          actionLabel="Add Medication"
          onAction={() => router.push('/medication/add')}
        />
      )}

      {!loading && !error && medications.length > 0 && filtered.length === 0 && (
        <View style={styles.noResults}>
          <Feather name="search" size={32} color={c.gray300} />
          <Text style={styles.noResultsText}>No medications match "{search}"</Text>
        </View>
      )}

      {!loading && !error && filtered.length > 0 && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      marginHorizontal: 24,
      marginTop: 16,
      marginBottom: 8,
      borderRadius: borderRadius.lg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: c.gray200,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: c.gray900,
      padding: 0,
    },
    list: {
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 40,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      padding: 16,
      marginBottom: 12,
      ...shadows.sm,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.tealLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    cardInfo: {
      flex: 1,
    },
    medName: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 2,
    },
    medDetail: {
      fontSize: 14,
      color: c.gray500,
    },
    noResults: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    noResultsText: {
      fontSize: 15,
      color: c.gray500,
      textAlign: 'center',
    },
  });
}
