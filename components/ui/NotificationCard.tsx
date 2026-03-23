import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, type ColorScheme, shadows } from './theme';

type Props = {
  pushEnabled: boolean;
  onPushChange: (value: boolean) => void;
};

export const NotificationCard = React.memo(function NotificationCard({
  pushEnabled,
  onPushChange,
}: Props) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.icon, { backgroundColor: c.tealLight }]}>
            <Feather name="bell" size={18} color={c.teal} />
          </View>
          <View>
            <Text style={styles.title}>Push Notifications</Text>
            <Text style={styles.desc}>Receive alerts on your device</Text>
          </View>
        </View>
        <Switch
          value={pushEnabled}
          onValueChange={onPushChange}
          trackColor={{ false: c.gray200, true: c.teal }}
          thumbColor={c.white}
          accessibilityLabel="Push Notifications"
          accessibilityHint="Toggle push notification reminders"
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <View style={styles.left}>
          <View style={[styles.icon, { backgroundColor: c.blueLight }]}>
            <Feather name="message-square" size={18} color={c.blue} />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: c.gray400 }]}>SMS Alerts</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Coming Soon</Text>
              </View>
            </View>
            <Text style={[styles.desc, { color: c.gray400 }]}>Receive text message reminders</Text>
          </View>
        </View>
        <Switch
          value={false}
          disabled
          trackColor={{ false: c.gray200, true: c.teal }}
          thumbColor={c.white}
          accessibilityLabel="SMS Alerts"
          accessibilityHint="Coming soon"
          accessibilityState={{ disabled: true }}
        />
      </View>
    </View>
  );
});

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      ...shadows.sm,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    badge: {
      backgroundColor: c.gray100,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: borderRadius.round,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.gray500,
    },
    desc: {
      fontSize: 13,
      color: c.gray500,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: c.gray100,
      marginVertical: 8,
    },
  });
}
