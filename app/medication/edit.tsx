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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Stepper } from '../../components/ui/Stepper';
import { type ColorScheme, borderRadius, shadows } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useMedication, type MedicationRow, type MedicationUpdate } from '../../contexts/MedicationContext';
import { scheduleLowSupplyReminder, cancelLowSupplyReminder } from '../../lib/notifications';
import Toast from 'react-native-toast-message';
import { ICON_OPTIONS } from '../../constants/icons';
import { FORM_OPTIONS } from '../../constants/medications';

export default function EditMedicationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { fetchMedication, updateMedication } = useMedication();

  // Local form state (not shared draft — isolated to this screen)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState<MedicationRow | null>(null);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState('tablet');
  const [icon, setIcon] = useState('pill');
  const [currentSupply, setCurrentSupply] = useState(30);
  const [lowSupplyThreshold, setLowSupplyThreshold] = useState(10);

  // Load existing medication
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const medResult = await fetchMedication(id);
      const data = medResult.data;
      if (data) {
        setOriginal(data);
        setName(data.name);
        setDosage(data.dosage);
        setForm(data.form ?? 'tablet');
        setIcon(data.icon ?? 'pill');
        setCurrentSupply(data.current_supply ?? 30);
        setLowSupplyThreshold(data.low_supply_threshold ?? 10);
      }
      setLoading(false);
    })();
  }, [id]);

  const isFormValid = name.trim().length > 0 && dosage.trim().length > 0;

  const handleSave = async () => {
    if (!id || !original) return;
    setSaving(true);

    const medUpdates: MedicationUpdate = {
      name,
      dosage,
      form,
      icon,
      current_supply: currentSupply,
      low_supply_threshold: lowSupplyThreshold,
    };

    const { error: medError } = await updateMedication(id, medUpdates);
    setSaving(false);

    if (medError) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: medError });
      return;
    }

    // Re-evaluate low-supply reminder after manual edit of supply or threshold
    if (currentSupply <= lowSupplyThreshold) {
      scheduleLowSupplyReminder(id, name, currentSupply).catch(() => {});
    } else {
      cancelLowSupplyReminder(id).catch(() => {});
    }

    Toast.show({ type: 'success', text1: 'Medication updated' });
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.teal} />
      </View>
    );
  }

  if (!original) {
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

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Medication Name</Text>
          <Input
            placeholder="e.g., Amoxicillin"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Dosage */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Dosage</Text>
          <Input
            placeholder="e.g., 500mg"
            value={dosage}
            onChangeText={setDosage}
          />
        </View>

        {/* Form Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Form</Text>
          <View style={styles.chipGrid}>
            {FORM_OPTIONS.map((f) => {
              const isSelected = form === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  activeOpacity={0.7}
                  onPress={() => setForm(f)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
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
              const isSelected = icon === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.iconOption, isSelected && styles.iconOptionSelected]}
                  activeOpacity={0.7}
                  onPress={() => setIcon(opt.key)}
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
