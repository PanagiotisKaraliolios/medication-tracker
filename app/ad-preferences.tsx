import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, type ColorScheme, gradients, shadows } from '../components/ui/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { type AdPreferences, useAdPreferences } from '../stores/adPreferencesStore';

type ToggleItem = {
  key: keyof AdPreferences;
  label: string;
  description: string;
};

const bannerItems: ToggleItem[] = [
  { key: 'todayBanner', label: 'Today Tab', description: 'Banner on the Today screen' },
  {
    key: 'medicationsBanner',
    label: 'Medications Tab',
    description: 'Banner on the Medications list',
  },
  { key: 'reportsBanner', label: 'Reports Tab', description: 'Banner on the Reports screen' },
  { key: 'profileBanner', label: 'Profile Tab', description: 'Banner on the Profile screen' },
  {
    key: 'medicationDetailBanner',
    label: 'Medication Detail',
    description: 'Banner on medication details',
  },
  {
    key: 'notificationsBanner',
    label: 'Notifications',
    description: 'Banner on the Notifications screen',
  },
  {
    key: 'notificationSettingsBanner',
    label: 'Notification Settings',
    description: 'Banner on notification settings',
  },
];

const otherItems: ToggleItem[] = [
  { key: 'interstitials', label: 'Full-Screen Ads', description: 'Shown after saving changes' },
  { key: 'appOpenAds', label: 'App Open Ads', description: 'Shown when returning to the app' },
];

export default function AdPreferencesScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const prefs = useAdPreferences();

  const allEnabled =
    bannerItems.every((i) => prefs[i.key]) && otherItems.every((i) => prefs[i.key]);
  const allDisabled =
    bannerItems.every((i) => !prefs[i.key]) && otherItems.every((i) => !prefs[i.key]);

  const renderToggle = (item: ToggleItem) => (
    <View key={item.key} style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{item.label}</Text>
        <Text style={styles.toggleDesc}>{item.description}</Text>
      </View>
      <Switch
        value={prefs[item.key]}
        onValueChange={() => prefs.toggle(item.key)}
        trackColor={{ false: c.gray300, true: c.teal }}
        thumbColor={c.white}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
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
          <Text style={styles.headerTitle}>Ad Preferences</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Choose where you see ads. Keeping ads enabled helps support free access to MediTrack.
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickButton, allEnabled && styles.quickButtonActive]}
            onPress={prefs.enableAll}
            activeOpacity={0.7}
          >
            <Feather name="check-circle" size={16} color={allEnabled ? c.white : c.teal} />
            <Text style={[styles.quickButtonText, allEnabled && styles.quickButtonTextActive]}>
              Enable All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickButton, allDisabled && styles.quickButtonActive]}
            onPress={prefs.disableAll}
            activeOpacity={0.7}
          >
            <Feather name="x-circle" size={16} color={allDisabled ? c.white : c.gray500} />
            <Text style={[styles.quickButtonText, allDisabled && styles.quickButtonTextActive]}>
              Disable All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Banner Ads section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="layout" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Banner Ads</Text>
          </View>
          <View style={styles.card}>
            {bannerItems.map((item, i) => (
              <React.Fragment key={item.key}>
                {i > 0 && <View style={styles.divider} />}
                {renderToggle(item)}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Other Ads section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="maximize" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Other Ads</Text>
          </View>
          <View style={styles.card}>
            {otherItems.map((item, i) => (
              <React.Fragment key={item.key}>
                {i > 0 && <View style={styles.divider} />}
                {renderToggle(item)}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Support the Developer */}
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => router.push('/support-developer')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.supportButtonGradient}
          >
            <Feather name="heart" size={20} color="#FFFFFF" />
            <View style={styles.supportButtonText}>
              <Text style={styles.supportButtonTitle}>Support the Developer</Text>
              <Text style={styles.supportButtonDesc}>View ads to help keep MediTrack free</Text>
            </View>
            <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: Math.max(insets.bottom, 20) + 20 }} />
      </ScrollView>
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
      paddingHorizontal: 20,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      fontSize: 20,
      fontWeight: '700',
      color: c.white,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.85)',
      textAlign: 'center',
      marginTop: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    quickActions: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    quickButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: borderRadius.lg,
      backgroundColor: c.card,
      ...shadows.sm,
    },
    quickButtonActive: {
      backgroundColor: c.teal,
    },
    quickButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray700,
    },
    quickButtonTextActive: {
      color: c.white,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray600,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 4,
      ...shadows.sm,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    toggleText: {
      flex: 1,
      marginRight: 12,
    },
    toggleLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
    },
    toggleDesc: {
      fontSize: 13,
      color: c.gray500,
      marginTop: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.gray200,
      marginHorizontal: 16,
    },
    supportCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      ...shadows.sm,
    },
    supportText: {
      flex: 1,
      fontSize: 14,
      color: c.gray600,
      lineHeight: 20,
    },
    supportButton: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      ...shadows.md,
    },
    supportButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: borderRadius.lg,
    },
    supportButtonText: {
      flex: 1,
    },
    supportButtonTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    supportButtonDesc: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
  });
}
