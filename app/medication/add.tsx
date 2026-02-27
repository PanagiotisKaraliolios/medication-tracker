import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { type ColorScheme, borderRadius, shadows } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useMedicationDraft } from '../../stores/draftStores';
import { useCreateMedication } from '../../hooks/useQueryHooks';
import Toast from 'react-native-toast-message';
import { ICON_OPTIONS } from '../../constants/icons';
import { FORM_OPTIONS } from '../../constants/medications';

export default function AddMedicationScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { draft, updateDraft, resetDraft } = useMedicationDraft();
  const createMedication = useCreateMedication();

  // Reset draft when opening screen
  useEffect(() => {
    resetDraft();
  }, []);

  const isFormValid = draft.name.trim().length > 0 && draft.dosage.trim().length > 0;

  const handleSave = async () => {
    try {
      await createMedication.mutateAsync();
      router.push('/medication/success');
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: err.message });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Medication Name</Text>
          <Input
            placeholder="e.g., Amoxicillin"
            value={draft.name}
            onChangeText={(v) => updateDraft({ name: v })}
          />
        </View>

        {/* Dosage */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Dosage</Text>
          <Input
            placeholder="e.g., 500mg"
            value={draft.dosage}
            onChangeText={(v) => updateDraft({ dosage: v })}
          />
        </View>

        {/* Form Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Form</Text>
          <View style={styles.chipGrid}>
            {FORM_OPTIONS.map((form) => {
              const isSelected = draft.form === form;
              return (
                <TouchableOpacity
                  key={form}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  activeOpacity={0.7}
                  onPress={() => updateDraft({ form })}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {form.charAt(0).toUpperCase() + form.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Icon Picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Icon</Text>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((opt) => {
              const isSelected = draft.icon === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.iconOption, isSelected && styles.iconOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => updateDraft({ icon: opt.key })}
                >
                  <Feather
                    name={opt.feather}
                    size={22}
                    color={isSelected ? c.white : c.gray600}
                  />
                  <Text style={[styles.iconLabel, isSelected && styles.iconLabelSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Current Supply */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Current Supply</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => updateDraft({ currentSupply: Math.max(0, draft.currentSupply - 1) })}
              activeOpacity={0.7}
            >
              <Feather name="minus" size={20} color={c.gray600} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{draft.currentSupply}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => updateDraft({ currentSupply: draft.currentSupply + 1 })}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={20} color={c.gray600} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Low Supply Threshold */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Low Supply Alert</Text>
          <Text style={styles.fieldHint}>Notify me when supply drops below this amount</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => updateDraft({ lowSupplyThreshold: Math.max(1, draft.lowSupplyThreshold - 1) })}
              activeOpacity={0.7}
            >
              <Feather name="minus" size={20} color={c.gray600} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{draft.lowSupplyThreshold}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => updateDraft({ lowSupplyThreshold: draft.lowSupplyThreshold + 1 })}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={20} color={c.gray600} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="primary" onPress={handleSave} disabled={!isFormValid || createMedication.isPending}>
          {createMedication.isPending ? 'Saving…' : 'Save Medication'}
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
    formContent: {
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
    fieldHint: {
      fontSize: 13,
      color: c.gray500,
      marginBottom: 10,
      marginTop: -4,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: borderRadius.round,
      backgroundColor: c.card,
      borderWidth: 1.5,
      borderColor: c.gray200,
    },
    chipSelected: {
      backgroundColor: c.teal,
      borderColor: c.teal,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '500',
      color: c.gray700,
    },
    chipTextSelected: {
      color: c.white,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    iconOption: {
      width: '22%',
      aspectRatio: 1,
      borderRadius: borderRadius.lg,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      gap: 4,
      ...shadows.sm,
    },
    iconOptionSelected: {
      backgroundColor: c.teal,
      borderColor: c.teal,
    },
    iconLabel: {
      fontSize: 11,
      color: c.gray500,
      fontWeight: '500',
    },
    iconLabelSelected: {
      color: c.white,
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
