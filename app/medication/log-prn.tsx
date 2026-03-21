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
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/LoadingState';
import { TimePickerModal } from '../../components/ui/TimePickerModal';
import { type ColorScheme, borderRadius, shadows } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMedications, useMedication as useMedicationQuery, useLogDose, useAdjustSupply } from '../../hooks/useQueryHooks';
import { PRN_REASONS } from '../../constants/symptoms';
import { getIconForForm } from '../../constants/icons';
import Toast from 'react-native-toast-message';
import { toISO } from '../../utils/date';

export default function LogPrnScreen() {
  const router = useRouter();
  const { medicationId: paramMedId } = useLocalSearchParams<{ medicationId?: string }>();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c, insets.bottom), [c, insets.bottom]);

  const [selectedMedId, setSelectedMedId] = useState<string | undefined>(paramMedId);
  const medicationId = selectedMedId;

  const { data: allMeds = [], isLoading: medsLoading } = useMedications();
  const prnMeds = useMemo(() => allMeds.filter((m) => m.is_prn), [allMeds]);

  const { data: med } = useMedicationQuery(medicationId);
  const logDoseMut = useLogDose();
  const adjustSupplyMut = useAdjustSupply();

  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [dosesCount, setDosesCount] = useState(1);
  const [customTime, setCustomTime] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const todayISO = useMemo(() => toISO(new Date()), []);

  const handleLog = useCallback(async () => {
    if (!medicationId || !med) return;

    try {
      const timeLabel = customTime ?? new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      await logDoseMut.mutateAsync({
        scheduleId: null,
        medicationId,
        date: todayISO,
        timeLabel,
        status: 'taken',
        reason: reason || null,
      });

      adjustSupplyMut.mutate({ medicationId, delta: -dosesCount });

      Toast.show({ type: 'success', text1: `${med.name} dose logged` });
      router.back();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Failed to log dose', text2: err.message });
    }
  }, [medicationId, med, reason, dosesCount, todayISO, customTime, logDoseMut, adjustSupplyMut, router]);

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
        {/* Medication picker */}
        {!medicationId && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Select Medication</Text>
            {medsLoading && <LoadingState />}
            {!medsLoading && prnMeds.length === 0 && (
              <EmptyState variant="medications" />
            )}
            {prnMeds.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.pickerCard}
                activeOpacity={0.7}
                onPress={() => setSelectedMedId(m.id)}
              >
                <View style={styles.pickerIcon}>
                  <MaterialCommunityIcons name={getIconForForm(m.form)} size={22} color={c.teal} />
                </View>
                <View style={styles.pickerInfo}>
                  <Text style={styles.pickerName}>{m.name}</Text>
                  <Text style={styles.pickerDosage}>{m.dosage} · {m.form}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={c.gray400} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Medication info */}
        {med && (
          <TouchableOpacity
            style={styles.medCard}
            activeOpacity={paramMedId ? 1 : 0.7}
            onPress={!paramMedId ? () => setSelectedMedId(undefined) : undefined}
          >
            <View style={styles.medCardHeader}>
              <Text style={styles.medName}>{med.name}</Text>
              {!paramMedId && <Feather name="x" size={18} color={c.gray400} />}
            </View>
            <Text style={styles.medDosage}>{med.dosage} · {med.form}</Text>
          </TouchableOpacity>
        )}

        {/* Dose count */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Number of Doses</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => setDosesCount((v) => Math.max(1, v - 1))}
              activeOpacity={0.7}
            >
              <Feather name="minus" size={20} color={c.gray600} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{dosesCount}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => setDosesCount((v) => v + 1)}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={20} color={c.gray600} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Time */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Time</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={[styles.timeOption, !customTime && styles.timeOptionSelected]}
              activeOpacity={0.7}
              onPress={() => setCustomTime(null)}
            >
              <Feather name="clock" size={16} color={!customTime ? c.teal : c.gray500} />
              <Text style={[styles.timeOptionText, !customTime && styles.timeOptionTextSelected]}>Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeOption, !!customTime && styles.timeOptionSelected]}
              activeOpacity={0.7}
              onPress={() => setShowTimePicker(true)}
            >
              <Feather name="edit-2" size={16} color={customTime ? c.teal : c.gray500} />
              <Text style={[styles.timeOptionText, !!customTime && styles.timeOptionTextSelected]}>
                {customTime ?? 'Custom'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reason */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Reason (optional)</Text>
          <View style={styles.chipGrid}>
            {PRN_REASONS.map((r) => {
              const selected = reason === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, selected && styles.chipSelected]}
                  activeOpacity={0.7}
                  onPress={() => setReason(selected ? '' : r)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {r}
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

      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onConfirm={(time) => {
          setCustomTime(time);
          setShowTimePicker(false);
        }}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          variant="primary"
          onPress={handleLog}
          disabled={logDoseMut.isPending || !medicationId}
        >
          {logDoseMut.isPending ? 'Logging…' : 'Log Dose'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
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
    medCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      marginBottom: 24,
      ...shadows.sm,
    },
    medCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    medName: {
      fontSize: 18,
      fontWeight: '700',
      color: c.gray900,
    },
    medDosage: {
      fontSize: 14,
      color: c.gray500,
      marginTop: 4,
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
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      gap: 24,
      ...shadows.sm,
    },
    stepperButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.gray100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperValue: {
      fontSize: 20,
      fontWeight: '600',
      color: c.gray900,
      minWidth: 60,
      textAlign: 'center',
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
    pickerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 14,
      marginBottom: 8,
      ...shadows.sm,
    },
    pickerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.tealLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    pickerInfo: {
      flex: 1,
    },
    pickerName: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
    },
    pickerDosage: {
      fontSize: 13,
      color: c.gray500,
      marginTop: 2,
    },
    timeRow: {
      flexDirection: 'row',
      gap: 10,
    },
    timeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: c.gray200,
    },
    timeOptionSelected: {
      backgroundColor: c.tealLight,
      borderColor: c.teal,
    },
    timeOptionText: {
      fontSize: 15,
      color: c.gray500,
    },
    timeOptionTextSelected: {
      color: c.teal,
      fontWeight: '600',
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
