import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AlertDialog } from '../../components/ui/AlertDialog';
import { DrugSearchInput } from '../../components/ui/DrugSearchInput';
import { InteractionWarning } from '../../components/ui/InteractionWarning';
import { type ColorScheme, borderRadius, tablet as tabletLayout } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsive } from '../../hooks/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMedicationDraft, useScheduleDraft } from '../../stores/draftStores';
import { useCreateMedication, useMedications } from '../../hooks/useQueryHooks';
import { useDrugSearch, useDrugInteractions } from '../../hooks/useDrugSearch';
import Toast from 'react-native-toast-message';
import { MEDICATION_TYPES } from '../../constants/medications';

export default function AddMedicationScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => makeStyles(c, insets.bottom, isTablet), [c, insets.bottom, isTablet]);
  const { draft, updateDraft, resetDraft } = useMedicationDraft();
  const createMedication = useCreateMedication();
  const { resetScheduleDraft, setSchedulingMedId } = useScheduleDraft();

  const [showSchedulePrompt, setShowSchedulePrompt] = useState(false);
  const createdMedIdRef = useRef<string | null>(null);

  // Drug search
  const { query: drugQuery, updateQuery: setDrugQuery, clearSearch, results: drugResults, isLoading: drugSearchLoading } = useDrugSearch();
  const { data: existingMeds = [] } = useMedications();

  // Build list of drug names for interaction checking
  const allDrugNames = useMemo(() => {
    const names = existingMeds.map(m => m.generic_name || m.name);
    if (draft.genericName) names.push(draft.genericName);
    else if (draft.name.trim()) names.push(draft.name.trim());
    return [...new Set(names)];
  }, [existingMeds, draft.genericName, draft.name]);

  const { data: interactions = [] } = useDrugInteractions(allDrugNames);

  // Reset draft when opening screen
  useEffect(() => {
    resetDraft();
    clearSearch();
  }, []);

  const isFormValid = draft.name.trim().length > 0 && draft.dosage.trim().length > 0;

  const handleSave = async () => {
    try {
      const created = await createMedication.mutateAsync();
      createdMedIdRef.current = created.id;
      if (draft.isPrn) {
        Toast.show({ type: 'success', text1: 'PRN medication added' });
        router.back();
      } else {
        setShowSchedulePrompt(true);
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Save failed', text2: err.message });
    }
  };

  const handleSchedule = () => {
    setShowSchedulePrompt(false);
    resetScheduleDraft();
    setSchedulingMedId(createdMedIdRef.current!);
    router.replace('/medication/schedule');
  };

  const handleSkip = () => {
    setShowSchedulePrompt(false);
    Toast.show({ type: 'success', text1: 'Medication added' });
    router.back();
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
        {/* Name — Drug Search */}
        <View style={[styles.fieldGroup, { zIndex: 10 }]}>
          <Text style={styles.fieldLabel}>Medication Name</Text>
          <DrugSearchInput
            query={draft.rxcui ? draft.name : drugQuery}
            onChangeQuery={(text) => {
              setDrugQuery(text);
              updateDraft({ name: text, rxcui: null, genericName: null });
            }}
            results={drugResults}
            isLoading={drugSearchLoading}
            selectedRxcui={draft.rxcui}
            onClear={() => {
              clearSearch();
              updateDraft({ name: '', rxcui: null, genericName: null });
            }}
            onSelect={(result) => {
              updateDraft({
                name: result.name,
                rxcui: result.rxcui,
                genericName: result.synonym || result.name,
              });
              clearSearch();
            }}
          />
        </View>

        {/* Drug Interaction Warning */}
        {interactions.length > 0 && (
          <View style={styles.fieldGroup}>
            <InteractionWarning interactions={interactions} />
          </View>
        )}

        {/* Dosage */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Dosage</Text>
          <Input
            placeholder="e.g., 500mg"
            value={draft.dosage}
            onChangeText={(v) => updateDraft({ dosage: v })}
          />
        </View>

        {/* Medication Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Medication Type</Text>
          <View style={styles.iconGrid}>
            {MEDICATION_TYPES.map((mt) => {
              const isSelected = draft.form === mt.form;
              return (
                <TouchableOpacity
                  key={mt.form}
                  style={[styles.iconOption, isSelected && styles.iconOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => updateDraft({ form: mt.form, icon: mt.form })}
                >
                  <MaterialCommunityIcons
                    name={mt.icon}
                    size={24}
                    color={isSelected ? c.white : c.gray600}
                  />
                  <Text style={[styles.iconLabel, isSelected && styles.iconLabelSelected]}>
                    {mt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* PRN (As Needed) Toggle */}
        <View style={styles.fieldGroup}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.fieldLabel}>Take as Needed (PRN)</Text>
              <Text style={styles.fieldHint}>No fixed schedule — log doses when you take them</Text>
            </View>
            <Switch
              value={draft.isPrn}
              onValueChange={(v) => updateDraft({ isPrn: v })}
              trackColor={{ false: c.gray200, true: c.tealLight }}
              thumbColor={draft.isPrn ? c.teal : c.gray400}
            />
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

      <AlertDialog
        visible={showSchedulePrompt}
        onClose={handleSkip}
        title="Set Up Schedule?"
        message="Would you like to set up a dosing schedule for this medication now?"
        variant="success"
        icon="calendar"
        confirmLabel="Set Schedule"
        cancelLabel="Not Now"
        onConfirm={handleSchedule}
      />
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ColorScheme, bottomInset: number, isTablet: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    formContent: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 120,
      ...(isTablet && { alignSelf: 'center' as const, width: '100%', maxWidth: tabletLayout.contentMaxWidth }),
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
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    iconOption: {
      flexBasis: '22%',
      flexGrow: 1,
      maxWidth: '24%',
      paddingVertical: 16,
      borderRadius: borderRadius.lg,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.gray200,
      gap: 4,
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
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      borderWidth: 1,
      borderColor: c.gray200,
    },
    toggleInfo: {
      flex: 1,
      marginRight: 12,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      gap: 24,
      borderWidth: 1,
      borderColor: c.gray200,
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
      paddingBottom: Math.max(32, bottomInset + 16),
      borderTopWidth: 1,
      borderTopColor: c.gray100,
    },
  });
}
