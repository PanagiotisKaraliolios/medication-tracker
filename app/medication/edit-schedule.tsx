import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { TimePickerModal } from '../../components/ui/TimePickerModal';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { DaySelector } from '../../components/ui/DaySelector';
import { TimeSlotGrid } from '../../components/ui/TimeSlotGrid';
import { CustomTimeChips } from '../../components/ui/CustomTimeChips';
import { Stepper } from '../../components/ui/Stepper';
import { DateRangeSection } from '../../components/ui/DateRangeSection';
import { NotificationCard } from '../../components/ui/NotificationCard';
import { type ColorScheme, borderRadius } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { showInterstitial } from '../../lib/interstitialManager';
import { useSchedule, useUpdateSchedule } from '../../hooks/useQueryHooks';
import Toast from 'react-native-toast-message';
import { PRESET_LABELS, FREQUENCY_OPTIONS, SNOOZE_OPTIONS } from '../../constants/schedule';
import { WEEKDAY_ORDER } from '../../constants/days';
import { capitalize } from '../../utils/string';
import type { ScheduleUpdate } from '../../types/database';

export default function EditScheduleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { data: original, isLoading: loading, error: queryError } = useSchedule(id);
  const updateScheduleMut = useUpdateSchedule();

  const [saving, setSaving] = useState(false);
  const [frequency, setFrequency] = useState('Daily');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [timesOfDay, setTimesOfDay] = useState<string[]>(['Morning']);
  const [dosagePerDose, setDosagePerDose] = useState(1);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [snoozeDuration, setSnoozeDuration] = useState('5 min');
  const [instructions, setInstructions] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const customTimes = timesOfDay.filter((t) => !PRESET_LABELS.has(t));

  // Populate local form state when data loads
  useEffect(() => {
    if (original && !initialized) {
      setFrequency(capitalize(original.frequency));
      setSelectedDays(original.selected_days);
      setTimesOfDay(original.times_of_day);
      setDosagePerDose(original.dosage_per_dose);
      setPushNotifications(original.push_notifications);
      setSnoozeDuration(original.snooze_duration);
      setInstructions(original.instructions ?? '');
      setStartDate(original.start_date ?? new Date().toISOString().slice(0, 10));
      setEndDate(original.end_date ?? null);
      setInitialized(true);
    }
  }, [original, initialized]);

  const toggleTime = (label: string) => {
    setTimesOfDay((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label],
    );
  };

  const handleCustomTimeConfirm = (time: string) => {
    if (!timesOfDay.includes(time)) {
      setTimesOfDay((prev) => [...prev, time]);
    }
    setShowTimePicker(false);
  };

  const isFormValid = timesOfDay.length > 0 && (frequency === 'Daily' || selectedDays.length > 0);

  const handleSave = async () => {
    if (!id || !original) return;
    setSaving(true);

    const updates: ScheduleUpdate = {
      frequency: frequency.toLowerCase(),
      selected_days: selectedDays,
      times_of_day: timesOfDay,
      dosage_per_dose: dosagePerDose,
      push_notifications: pushNotifications,
      snooze_duration: snoozeDuration,
      instructions,
      start_date: startDate,
      end_date: endDate,
    };

    try {
      await updateScheduleMut.mutateAsync({ id, updates });
      Toast.show({ type: 'success', text1: 'Schedule updated' });
      showInterstitial(() => router.back());
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.teal} />
      </View>
    );
  }

  if (!original && !loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Feather name="alert-circle" size={48} color={c.error} />
        <Text style={{ color: c.gray600, fontSize: 16, marginTop: 12 }}>Schedule not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Schedule ── */}
        <Text style={styles.groupTitle}>Schedule</Text>

        {/* Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequency</Text>
          <SegmentedControl
            options={[...FREQUENCY_OPTIONS]}
            selected={frequency}
            onChange={setFrequency}
          />
        </View>

        {/* Day selector */}
        {frequency !== 'Daily' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Days</Text>
            <DaySelector
              days={[...WEEKDAY_ORDER]}
              selected={selectedDays}
              onChange={setSelectedDays}
            />
          </View>
        )}

        {/* Time selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time of Day</Text>
          <TimeSlotGrid selected={timesOfDay} onToggle={toggleTime} />
          <CustomTimeChips
            times={customTimes}
            onRemove={(t) => setTimesOfDay((prev) => prev.filter((x) => x !== t))}
          />

          <TouchableOpacity
            style={styles.addCustomTimeButton}
            activeOpacity={0.7}
            onPress={() => setShowTimePicker(true)}
          >
            <Feather name="plus-circle" size={20} color={c.teal} />
            <Text style={styles.addCustomTimeText}>Add Custom Time</Text>
          </TouchableOpacity>

          <TimePickerModal
            visible={showTimePicker}
            onClose={() => setShowTimePicker(false)}
            onConfirm={handleCustomTimeConfirm}
          />
        </View>

        {/* Dosage stepper */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dosage per Dose</Text>
          <Stepper
            value={dosagePerDose}
            onChange={setDosagePerDose}
            suffix={{ singular: 'pill', plural: 'pills' }}
          />
        </View>

        {/* ── Schedule Duration ── */}
        <Text style={styles.groupTitle}>Schedule Duration</Text>

        <View style={styles.section}>
          <DateRangeSection
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(date) => {
              setStartDate(date);
              if (endDate && date > endDate) setEndDate(date);
            }}
            onEndDateChange={setEndDate}
          />
        </View>

        {/* ── Reminders ── */}
        <Text style={styles.groupTitle}>Reminders</Text>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <NotificationCard pushEnabled={pushNotifications} onPushChange={setPushNotifications} />
        </View>

        {/* Snooze Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snooze Duration</Text>
          <SegmentedControl
            options={[...SNOOZE_OPTIONS]}
            selected={snoozeDuration}
            onChange={setSnoozeDuration}
          />
        </View>

        {/* Special Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Take with food, Avoid alcohol..."
            placeholderTextColor={c.gray400}
            multiline
            numberOfLines={4}
            value={instructions}
            onChangeText={setInstructions}
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button variant="primary" onPress={handleSave} disabled={!isFormValid || saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </View>
    </KeyboardAvoidingView>
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
      paddingBottom: 120,
    },
    groupTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.gray900,
      marginBottom: 16,
      marginTop: 8,
    },
    section: {
      gap: 16,
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 12,
    },
    addCustomTimeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.teal,
      borderRadius: borderRadius.lg,
      backgroundColor: c.card,
    },
    addCustomTimeText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.teal,
    },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.gray200,
      borderRadius: borderRadius.lg,
      padding: 16,
      fontSize: 15,
      color: c.gray900,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: c.card,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 32,
      borderTopWidth: 1,
      borderTopColor: c.gray100,
    },
  });
}
