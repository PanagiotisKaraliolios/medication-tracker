import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Button } from '../../components/ui/Button';
import { borderRadius, type ColorScheme, shadows } from '../../components/ui/theme';
import {
  useCreateSchedule,
  useSchedulesByMedication,
  useUpdateSchedule,
} from '../../hooks/useQueryHooks';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useScheduleDraft } from '../../stores/draftStores';
import { formatDateLabel } from '../../utils/date';

export default function ReviewScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c, insets.bottom), [c, insets.bottom]);
  const { scheduleDraft, schedulingMedId } = useScheduleDraft();
  const createScheduleMut = useCreateSchedule();
  const updateScheduleMut = useUpdateSchedule();
  const { data: existingSchedules = [] } = useSchedulesByMedication(schedulingMedId ?? undefined);
  const [saving, setSaving] = useState(false);

  const reviewSections = useMemo(() => {
    return [
      {
        icon: 'clock' as const,
        iconBg: c.blueLight,
        iconColor: c.blue,
        title: 'Schedule',
        items: [
          scheduleDraft.frequency === 'Interval' && scheduleDraft.intervalDays
            ? `Every ${scheduleDraft.intervalDays} days`
            : scheduleDraft.frequency === 'Weekly'
              ? `${scheduleDraft.frequency} — ${scheduleDraft.selectedDays.join(', ')}`
              : scheduleDraft.frequency,
          scheduleDraft.timesOfDay.join(', '),
          `${scheduleDraft.dosagePerDose} ${scheduleDraft.dosagePerDose === 1 ? 'pill' : 'pills'} per dose`,
        ],
      },
      {
        icon: 'calendar' as const,
        iconBg: c.tealLight,
        iconColor: c.teal,
        title: 'Duration',
        items: [
          `Starts: ${formatDateLabel(scheduleDraft.startDate)}`,
          scheduleDraft.endDate
            ? `Ends: ${formatDateLabel(scheduleDraft.endDate)}`
            : 'Continues forever',
        ],
      },
      {
        icon: 'bell' as const,
        iconBg: c.warningLight,
        iconColor: c.warning,
        title: 'Reminders',
        items: [
          `Push Notifications: ${scheduleDraft.pushNotifications ? 'On' : 'Off'}`,
          `SMS Alerts: ${scheduleDraft.smsAlerts ? 'On' : 'Off'}`,
          `Snooze: ${scheduleDraft.snoozeDuration}`,
        ],
      },
      ...(scheduleDraft.instructions
        ? [
            {
              icon: 'file-text' as const,
              iconBg: c.successLight,
              iconColor: c.success,
              title: 'Instructions',
              items: [scheduleDraft.instructions],
            },
          ]
        : []),
    ];
  }, [scheduleDraft, c]);

  const handleSave = async () => {
    if (!schedulingMedId) return;
    setSaving(true);

    try {
      if (existingSchedules.length > 0) {
        // Update existing schedule
        await updateScheduleMut.mutateAsync({
          id: existingSchedules[0].id,
          updates: {
            frequency: scheduleDraft.frequency.toLowerCase(),
            selected_days: scheduleDraft.selectedDays,
            times_of_day: scheduleDraft.timesOfDay,
            dosage_per_dose: scheduleDraft.dosagePerDose,
            push_notifications: scheduleDraft.pushNotifications,
            sms_alerts: scheduleDraft.smsAlerts,
            snooze_duration: scheduleDraft.snoozeDuration,
            instructions: scheduleDraft.instructions,
            start_date: scheduleDraft.startDate,
            end_date: scheduleDraft.endDate,
            interval_days:
              scheduleDraft.frequency === 'Interval' ? (scheduleDraft.intervalDays ?? 2) : null,
          },
        });
      } else {
        // Create new schedule
        await createScheduleMut.mutateAsync({
          medicationId: schedulingMedId,
          scheduleDraft,
        });
      }

      router.replace('/medication/success');
    } catch (err: unknown) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Review the schedule details before saving.</Text>

        {reviewSections.map((section) => (
          <View key={section.title} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: section.iconBg }]}>
                <Feather name={section.icon} size={18} color={section.iconColor} />
              </View>
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            <View style={styles.cardBody}>
              {section.items.map((item) => (
                <View key={item} style={styles.cardRow}>
                  <View style={styles.dot} />
                  <Text style={styles.cardValue}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="primary" onPress={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Schedule'}
        </Button>
      </View>
    </View>
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
      paddingTop: 8,
      paddingBottom: 120,
    },
    subtitle: {
      fontSize: 15,
      color: c.gray500,
      marginBottom: 20,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      marginBottom: 16,
      ...shadows.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    cardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
    },
    cardBody: {
      paddingLeft: 48,
      gap: 6,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.gray300,
    },
    cardValue: {
      fontSize: 14,
      color: c.gray600,
      flex: 1,
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
