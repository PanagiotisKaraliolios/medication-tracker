import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AdBanner } from '../components/ui/AdBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { borderRadius, type ColorScheme, gradients, shadows } from '../components/ui/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { deduplicateScheduledNotifications } from '../lib/notifications';
import {
  buildDeliveredItems,
  buildScheduledItems,
  getNotificationIcon,
  type NotificationItem,
} from '../utils/notificationHelpers';

// ── Screen ───────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduled, setScheduled] = useState<NotificationItem[]>([]);
  const [delivered, setDelivered] = useState<NotificationItem[]>([]);

  const loadNotifications = useCallback(async (deduplicate = false) => {
    try {
      if (deduplicate) {
        await deduplicateScheduledNotifications();
      }

      const [scheduledNotifs, deliveredNotifs] = await Promise.all([
        Notifications.getAllScheduledNotificationsAsync(),
        Notifications.getPresentedNotificationsAsync(),
      ]);

      setScheduled(buildScheduledItems(scheduledNotifs));
      setDelivered(buildDeliveredItems(deliveredNotifs));
    } catch (err) {
      console.warn('[Notifications] Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(true);
  }, [loadNotifications]);

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await Notifications.dismissNotificationAsync(id);
      setDelivered((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // already dismissed
    }
  }, []);

  const handleDismissAll = useCallback(async () => {
    try {
      await Notifications.dismissAllNotificationsAsync();
      setDelivered([]);
    } catch {
      // best-effort
    }
  }, []);

  const totalCount = scheduled.length + delivered.length;

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
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerRight}>
            {delivered.length > 0 && (
              <TouchableOpacity
                onPress={handleDismissAll}
                activeOpacity={0.7}
                style={styles.clearButton}
              >
                <Text style={styles.clearText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {totalCount === 0
            ? 'No notifications'
            : `${scheduled.length} upcoming · ${delivered.length} recent`}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.teal} />
        }
      >
        {loading && <LoadingState message="Loading notifications…" />}

        {!loading && totalCount === 0 && (
          <EmptyState
            variant="schedule"
            title="No notifications"
            message="You don't have any scheduled or recent notifications. Set up medication schedules with push notifications enabled to see them here."
          />
        )}

        {/* Upcoming Section */}
        {!loading && scheduled.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="clock" size={18} color={c.teal} />
              <Text style={styles.sectionTitle}>Upcoming</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{scheduled.length}</Text>
              </View>
            </View>
            {scheduled.map((item) => (
              <NotificationCard key={item.id} item={item} c={c} styles={styles} />
            ))}
          </View>
        )}

        {/* Recent Section */}
        {!loading && delivered.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="check-circle" size={18} color={c.success} />
              <Text style={styles.sectionTitle}>Recent</Text>
              <View style={[styles.badge, { backgroundColor: c.successLight }]}>
                <Text style={[styles.badgeText, { color: c.success }]}>{delivered.length}</Text>
              </View>
            </View>
            {delivered.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                c={c}
                styles={styles}
                onDismiss={() => handleDismiss(item.id)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AdBanner placement="notificationsBanner" />
    </View>
  );
}

// ── Notification Card Component ──────────────────────────────────────

function NotificationCard({
  item,
  c,
  styles,
  onDismiss,
}: {
  item: NotificationItem;
  c: ColorScheme;
  styles: ReturnType<typeof makeStyles>;
  onDismiss?: () => void;
}) {
  const icon = getNotificationIcon(item.data);
  const isScheduled = item.type === 'scheduled';
  const iconBg = isScheduled ? c.tealLight : c.successLight;
  const iconColor = isScheduled ? c.teal : c.success;

  return (
    <View style={styles.card}>
      <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardBody} numberOfLines={2}>
          {item.body}
        </Text>
        <View style={styles.cardMeta}>
          <Feather name={isScheduled ? 'repeat' : 'clock'} size={12} color={c.gray400} />
          <Text style={styles.cardTime}>{item.timeInfo}</Text>
          {isScheduled && item.dateInfo && (
            <>
              <Text style={styles.cardTimeSep}>·</Text>
              <Feather name="calendar" size={12} color={c.gray400} />
              <Text style={styles.cardTime}>{item.dateInfo}</Text>
            </>
          )}
        </View>
      </View>
      {onDismiss && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={onDismiss}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Feather name="x" size={16} color={c.gray400} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingTop: 60,
      paddingHorizontal: 24,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
      flex: 1,
      fontSize: 22,
      fontWeight: '700',
      color: c.white,
      marginLeft: 12,
    },
    headerRight: {
      minWidth: 40,
      alignItems: 'flex-end',
    },
    clearButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.round,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    clearText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.white,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginLeft: 52,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    section: {
      marginBottom: 28,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: c.gray900,
      flex: 1,
    },
    badge: {
      backgroundColor: c.tealLight,
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: borderRadius.round,
    },
    badgeText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.teal,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      marginBottom: 12,
      ...shadows.sm,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 2,
    },
    cardBody: {
      fontSize: 13,
      color: c.gray500,
      lineHeight: 18,
      marginBottom: 6,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardTime: {
      fontSize: 12,
      color: c.gray400,
    },
    cardTimeSep: {
      fontSize: 12,
      color: c.gray400,
      marginHorizontal: 2,
    },
    dismissButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.gray100,
      marginLeft: 8,
    },
  });
}
