import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { NotificationCard } from '../../components/ui/NotificationCard';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { borderRadius, type ColorScheme } from '../../components/ui/theme';
import { SNOOZE_OPTIONS } from '../../constants/schedule';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useScheduleDraft } from '../../stores/draftStores';

export default function RemindersScreen() {
  const router = useRouter();
  const scheduleDraft = useScheduleDraft((s) => s.scheduleDraft);
  const updateScheduleDraft = useScheduleDraft((s) => s.updateScheduleDraft);
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c, insets.bottom), [c, insets.bottom]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <NotificationCard
            pushEnabled={scheduleDraft.pushNotifications}
            onPushChange={(v) => updateScheduleDraft({ pushNotifications: v })}
          />
        </View>

        {/* Snooze Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snooze Duration</Text>
          <SegmentedControl
            options={[...SNOOZE_OPTIONS]}
            selected={scheduleDraft.snoozeDuration}
            onChange={(v) => updateScheduleDraft({ snoozeDuration: v })}
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
            value={scheduleDraft.instructions}
            onChangeText={(v) => updateScheduleDraft({ instructions: v })}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="primary" onPress={() => router.push('/medication/review')}>
          Next: Review
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
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 12,
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
      paddingBottom: Math.max(32, bottomInset + 16),
      borderTopWidth: 1,
      borderTopColor: c.gray100,
    },
  });
}
