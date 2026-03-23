import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { CustomTimeChips } from '../../components/ui/CustomTimeChips';
import { DateRangeSection } from '../../components/ui/DateRangeSection';
import { DaySelector } from '../../components/ui/DaySelector';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Stepper } from '../../components/ui/Stepper';
import { TimePickerModal } from '../../components/ui/TimePickerModal';
import { TimeSlotGrid } from '../../components/ui/TimeSlotGrid';
import { borderRadius, type ColorScheme } from '../../components/ui/theme';
import { WEEKDAY_ORDER } from '../../constants/days';
import { FREQUENCY_OPTIONS, PRESET_LABELS } from '../../constants/schedule';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useScheduleDraft } from '../../stores/draftStores';

export default function ScheduleScreen() {
  const router = useRouter();
  const scheduleDraft = useScheduleDraft((s) => s.scheduleDraft);
  const updateScheduleDraft = useScheduleDraft((s) => s.updateScheduleDraft);
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c, insets.bottom), [c, insets.bottom]);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const customTimes = scheduleDraft.timesOfDay.filter((t) => !PRESET_LABELS.has(t));

  const toggleTime = (label: string) => {
    const prev = scheduleDraft.timesOfDay;
    updateScheduleDraft({
      timesOfDay: prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label],
    });
  };

  const handleCustomTimeConfirm = (time: string) => {
    if (!scheduleDraft.timesOfDay.includes(time)) {
      updateScheduleDraft({ timesOfDay: [...scheduleDraft.timesOfDay, time] });
    }
    setShowTimePicker(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequency</Text>
          <SegmentedControl
            options={[...FREQUENCY_OPTIONS]}
            selected={scheduleDraft.frequency}
            onChange={(v) => updateScheduleDraft({ frequency: v })}
          />
        </View>

        {/* Day selector (Weekly) or Interval stepper */}
        {scheduleDraft.frequency === 'Interval' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Repeat Every</Text>
            <Stepper
              value={scheduleDraft.intervalDays ?? 2}
              onChange={(v) => updateScheduleDraft({ intervalDays: v })}
              min={2}
              max={90}
              suffix={{ singular: 'day', plural: 'days' }}
            />
          </View>
        )}
        {scheduleDraft.frequency === 'Weekly' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Days</Text>
            <DaySelector
              days={[...WEEKDAY_ORDER]}
              selected={scheduleDraft.selectedDays}
              onChange={(v) => updateScheduleDraft({ selectedDays: v })}
            />
          </View>
        )}

        {/* Time selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time of Day</Text>
          <TimeSlotGrid selected={scheduleDraft.timesOfDay} onToggle={toggleTime} />
          <CustomTimeChips
            times={customTimes}
            onRemove={(t) =>
              updateScheduleDraft({ timesOfDay: scheduleDraft.timesOfDay.filter((x) => x !== t) })
            }
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

        {/* Schedule Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Duration</Text>
          <DateRangeSection
            startDate={scheduleDraft.startDate}
            endDate={scheduleDraft.endDate}
            onStartDateChange={(date) => {
              updateScheduleDraft({ startDate: date });
              if (scheduleDraft.endDate && date > scheduleDraft.endDate) {
                updateScheduleDraft({ endDate: date });
              }
            }}
            onEndDateChange={(date) => updateScheduleDraft({ endDate: date })}
          />
        </View>

        {/* Dosage stepper */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dosage per Dose</Text>
          <Stepper
            value={scheduleDraft.dosagePerDose}
            onChange={(v) => updateScheduleDraft({ dosagePerDose: v })}
            suffix={{ singular: 'pill', plural: 'pills' }}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="primary" onPress={() => router.push('/medication/reminders')}>
          Next: Reminders
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
      paddingTop: 16,
      paddingBottom: 120,
    },
    section: {
      gap: 16,
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
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
