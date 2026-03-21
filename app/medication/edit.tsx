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
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Stepper } from '../../components/ui/Stepper';
import { DrugSearchInput } from '../../components/ui/DrugSearchInput';
import { InteractionWarning } from '../../components/ui/InteractionWarning';
import { type ColorScheme, borderRadius, tablet as tabletLayout } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsive } from '../../hooks/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMedication as useMedicationQuery, useUpdateMedication, useMedications } from '../../hooks/useQueryHooks';
import { useDrugSearch, useDrugInteractions } from '../../hooks/useDrugSearch';
import { scheduleLowSupplyReminder, cancelLowSupplyReminder } from '../../lib/notifications';
import Toast from 'react-native-toast-message';
import { MEDICATION_TYPES } from '../../constants/medications';
import type { MedicationUpdate } from '../../types/database';
import { showInterstitial } from '../../lib/interstitialManager';

export default function EditMedicationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => makeStyles(c, insets.bottom, isTablet), [c, insets.bottom, isTablet]);
  const { data: original, isLoading: loading, error: queryError } = useMedicationQuery(id);
  const updateMedicationMut = useUpdateMedication();

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState('tablet');
  const [currentSupply, setCurrentSupply] = useState(30);
  const [lowSupplyThreshold, setLowSupplyThreshold] = useState(10);
  const [isPrn, setIsPrn] = useState(false);
  const [rxcui, setRxcui] = useState<string | null>(null);
  const [genericName, setGenericName] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Drug search
  const { query: drugQuery, updateQuery: setDrugQuery, clearSearch, results: drugResults, isLoading: drugSearchLoading } = useDrugSearch();
  const { data: existingMeds = [] } = useMedications();

  const allDrugNames = useMemo(() => {
    const names = existingMeds
      .filter(m => m.id !== id) // exclude the medication being edited
      .map(m => m.generic_name || m.name);
    if (genericName) names.push(genericName);
    else if (name.trim()) names.push(name.trim());
    return [...new Set(names)];
  }, [existingMeds, id, genericName, name]);

  const { data: interactions = [] } = useDrugInteractions(allDrugNames);

  // Populate local form state when data loads
  useEffect(() => {
    if (original && !initialized) {
      setName(original.name);
      setDosage(original.dosage);
      setForm(original.form ?? 'tablet');
      setCurrentSupply(original.current_supply ?? 30);
      setLowSupplyThreshold(original.low_supply_threshold ?? 10);
      setIsPrn(original.is_prn ?? false);
      setRxcui(original.rxcui ?? null);
      setGenericName(original.generic_name ?? null);
      setInitialized(true);
    }
  }, [original, initialized]);

  const isFormValid = name.trim().length > 0 && dosage.trim().length > 0;

  const handleSave = async () => {
    if (!id || !original) return;
    setSaving(true);

    const medUpdates: MedicationUpdate = {
      name,
      dosage,
      form,
      icon: form,
      current_supply: currentSupply,
      low_supply_threshold: lowSupplyThreshold,
      is_prn: isPrn,
      rxcui: rxcui,
      generic_name: genericName,
    };

    try {
      await updateMedicationMut.mutateAsync({ id, updates: medUpdates });

      // Re-evaluate low-supply reminder after manual edit of supply or threshold
      if (currentSupply <= lowSupplyThreshold) {
        scheduleLowSupplyReminder(id, name, currentSupply).catch(() => {});
      } else {
        cancelLowSupplyReminder(id).catch(() => {});
      }

      Toast.show({ type: 'success', text1: 'Medication updated' });
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
        <Text style={{ color: c.gray600, fontSize: 16, marginTop: 12 }}>Medication not found</Text>
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
        {/* ── Medication Details ── */}
        <Text style={styles.groupTitle}>Medication Details</Text>

        {/* Name — Drug Search */}
        <View style={[styles.fieldGroup, { zIndex: 10 }]}>
          <Text style={styles.fieldLabel}>Medication Name</Text>
          <DrugSearchInput
            query={rxcui ? name : drugQuery}
            onChangeQuery={(text) => {
              setDrugQuery(text);
              setName(text);
              setRxcui(null);
              setGenericName(null);
            }}
            results={drugResults}
            isLoading={drugSearchLoading}
            selectedRxcui={rxcui}
            onClear={() => {
              clearSearch();
              setName('');
              setRxcui(null);
              setGenericName(null);
            }}
            onSelect={(result) => {
              setName(result.name);
              setRxcui(result.rxcui);
              setGenericName(result.synonym || result.name);
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
            value={dosage}
            onChangeText={setDosage}
          />
        </View>

        {/* Medication Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Medication Type</Text>
          <View style={styles.iconGrid}>
            {MEDICATION_TYPES.map((mt) => {
              const isSelected = form === mt.form;
              return (
                <TouchableOpacity
                  key={mt.form}
                  style={[styles.iconOption, isSelected && styles.iconOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setForm(mt.form)}
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

        {/* PRN Toggle */}
        <View style={styles.fieldGroup}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.fieldLabel}>Take as Needed (PRN)</Text>
              <Text style={styles.fieldHint}>No fixed schedule — log doses when you take them</Text>
            </View>
            <Switch
              value={isPrn}
              onValueChange={setIsPrn}
              trackColor={{ false: c.gray200, true: c.tealLight }}
              thumbColor={isPrn ? c.teal : c.gray400}
            />
          </View>
        </View>

        {/* ── Inventory ── */}
        <Text style={styles.groupTitle}>Inventory</Text>

        {/* Current Supply */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Current Supply</Text>
          <Stepper value={currentSupply} onChange={setCurrentSupply} min={0} />
        </View>

        {/* Low Supply Threshold */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Low Supply Alert</Text>
          <Text style={styles.fieldHint}>Notify me when supply drops below this amount</Text>
          <Stepper value={lowSupplyThreshold} onChange={setLowSupplyThreshold} />
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

function makeStyles(c: ColorScheme, bottomInset: number, isTablet: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 120,
      ...(isTablet && { alignSelf: 'center' as const, width: '100%', maxWidth: tabletLayout.contentMaxWidth }),
    },
    groupTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.gray900,
      marginBottom: 16,
      marginTop: 8,
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
