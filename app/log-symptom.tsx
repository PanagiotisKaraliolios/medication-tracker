import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { DatePickerModal } from '../components/ui/DatePickerModal';
import { TimePickerModal } from '../components/ui/TimePickerModal';
import { type ColorScheme, borderRadius, shadows } from '../components/ui/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMedications, useLogSymptom } from '../hooks/useQueryHooks';
import { SYMPTOM_PRESETS, SEVERITY_OPTIONS } from '../constants/symptoms';
import { capitalize } from '../utils/string';
import { toISO, formatDateLabel } from '../utils/date';
import Toast from 'react-native-toast-message';

export default function LogSymptomScreen() {
  const router = useRouter();
  const { medicationId: preselectedMedId, date: dateParam } = useLocalSearchParams<{ medicationId?: string; date?: string }>();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c, insets.bottom), [c, insets.bottom]);

  const { data: medications = [] } = useMedications();
  const logSymptomMut = useLogSymptom();

  const [name, setName] = useState('');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate');
  const [selectedMedId, setSelectedMedId] = useState<string | null>(preselectedMedId ?? null);
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(dateParam ?? toISO(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const todayISO = toISO(new Date());
  const isToday = selectedDate === todayISO;

  const isFormValid = name.trim().length > 0;

  const handleLog = useCallback(async () => {
    try {
      await logSymptomMut.mutateAsync({
        name: name.trim(),
        severity,
        medicationId: selectedMedId,
        notes: notes.trim() || null,
        loggedDate: selectedDate,
        loggedAt: selectedTime ? `${selectedDate}T${convertTo24h(selectedTime)}:00` : undefined,
      });
      Toast.show({ type: 'success', text1: 'Symptom logged' });
      router.back();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Failed to log symptom', text2: err.message });
    }
  }, [name, severity, selectedMedId, notes, selectedDate, selectedTime, logSymptomMut, router]);

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
        {/* Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            activeOpacity={0.7}
            onPress={() => setShowDatePicker(true)}
          >
            <Feather name="calendar" size={18} color={c.teal} />
            <Text style={styles.dateButtonText}>
              {isToday ? 'Today' : formatDateLabel(selectedDate)}
            </Text>
            <Feather name="chevron-down" size={16} color={c.gray400} />
          </TouchableOpacity>
        </View>

        {/* Time (optional) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Time (optional)</Text>
          {selectedTime ? (
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={[styles.dateButton, { flex: 1 }]}
                activeOpacity={0.7}
                onPress={() => setShowTimePicker(true)}
              >
                <Feather name="clock" size={18} color={c.teal} />
                <Text style={styles.dateButtonText}>{selectedTime}</Text>
                <Feather name="chevron-down" size={16} color={c.gray400} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedTime(null)}
                activeOpacity={0.7}
                style={styles.clearTimeButton}
              >
                <Feather name="x" size={18} color={c.gray500} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addTimeButton}
              activeOpacity={0.7}
              onPress={() => setShowTimePicker(true)}
            >
              <Feather name="plus" size={16} color={c.teal} />
              <Text style={styles.addTimeText}>Add time</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Symptom Name — presets */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Symptom</Text>
          <View style={styles.chipGrid}>
            {SYMPTOM_PRESETS.map((preset) => {
              const selected = name === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[styles.chip, selected && styles.chipSelected]}
                  activeOpacity={0.7}
                  onPress={() => setName(selected ? '' : preset)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {preset}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ marginTop: 12 }}>
            <Input
              placeholder="Or type a custom symptom…"
              value={SYMPTOM_PRESETS.includes(name as any) ? '' : name}
              onChangeText={setName}
            />
          </View>
        </View>

        {/* Severity */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Severity</Text>
          <SegmentedControl
            options={SEVERITY_OPTIONS.map(capitalize)}
            selected={capitalize(severity)}
            onChange={(val) => setSeverity(val.toLowerCase() as typeof severity)}
          />
        </View>

        {/* Link to medication */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Related Medication (optional)</Text>
          <View style={styles.chipGrid}>
            <TouchableOpacity
              style={[styles.medChip, selectedMedId === null && styles.medChipSelected]}
              activeOpacity={0.7}
              onPress={() => setSelectedMedId(null)}
            >
              <Text style={[styles.chipText, selectedMedId === null && styles.chipTextSelected]}>
                None
              </Text>
            </TouchableOpacity>
            {medications.map((med) => {
              const selected = selectedMedId === med.id;
              return (
                <TouchableOpacity
                  key={med.id}
                  style={[styles.medChip, selected && styles.medChipSelected]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedMedId(selected ? null : med.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {med.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <Input
            placeholder="Any additional details…"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          variant="primary"
          onPress={handleLog}
          disabled={!isFormValid || logSymptomMut.isPending}
        >
          {logSymptomMut.isPending ? 'Logging…' : 'Log Symptom'}
        </Button>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(dateISO) => {
          setSelectedDate(dateISO);
          setShowDatePicker(false);
        }}
        initialDate={selectedDate}
        maxDate={todayISO}
        title="Symptom Date"
      />

      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onConfirm={(time) => {
          setSelectedTime(time);
          setShowTimePicker(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

/** Convert "9:30 AM" → "09:30" for ISO string building */
function convertTo24h(time12: string): string {
  const [timePart, period] = time12.split(' ');
  let [h, m] = timePart.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function makeStyles(c: ColorScheme, bottomInset: number) {
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
    fieldGroup: {
      marginBottom: 24,
    },
    fieldLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 10,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: borderRadius.round,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.gray200,
    },
    chipSelected: {
      backgroundColor: c.tealLight,
      borderColor: c.teal,
    },
    chipText: {
      fontSize: 14,
      color: c.gray600,
    },
    chipTextSelected: {
      color: c.teal,
      fontWeight: '600',
    },
    medChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: borderRadius.round,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.gray200,
    },
    medChipSelected: {
      backgroundColor: c.tealLight,
      borderColor: c.teal,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.card,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.gray200,
    },
    dateButtonText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: c.gray900,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    clearTimeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.gray200,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addTimeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
    },
    addTimeText: {
      fontSize: 14,
      fontWeight: '500',
      color: c.teal,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: c.card,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: Math.max(32, bottomInset + 16),
      borderTopWidth: 1,
      borderTopColor: c.gray100,
    },
  });
}
