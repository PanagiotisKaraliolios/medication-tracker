import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, type ColorScheme, gradients, shadows } from '../components/ui/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { AD_UNIT_IDS } from '../lib/ads';

const AD_SLOTS: { size: BannerAdSize; label: string }[] = [
  { size: BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER, label: 'adaptive-1' },
  { size: BannerAdSize.MEDIUM_RECTANGLE, label: 'rectangle-1' },
  { size: BannerAdSize.LARGE_BANNER, label: 'large-1' },
  { size: BannerAdSize.MEDIUM_RECTANGLE, label: 'rectangle-2' },
  { size: BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER, label: 'adaptive-2' },
  { size: BannerAdSize.LARGE_BANNER, label: 'large-2' },
];

export default function SupportDeveloperScreen() {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();

  const [refreshKey, setRefreshKey] = useState(0);
  const [failedSlots, setFailedSlots] = useState<Set<string>>(new Set());

  const handleRefresh = useCallback(() => {
    setFailedSlots(new Set());
    setRefreshKey((k) => k + 1);
  }, []);

  const handleAdFailed = useCallback((label: string, error: unknown) => {
    console.log(
      `[SupportDev] Ad FAILED: ${label}`,
      error instanceof Error ? error.message : String(error),
    );
    setFailedSlots((prev) => new Set(prev).add(label));
  }, []);

  const requestOptions = useMemo(() => {
    const opts = { requestNonPersonalizedAdsOnly: true };
    console.log('[SupportDev] requestOptions:', opts);
    return opts;
  }, []);

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
          <Text style={styles.headerTitle}>Support the Developer</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>
          Every ad view helps keep MediTrack free. Thank you for your support!
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Refresh button */}
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} activeOpacity={0.7}>
          <Feather name="refresh-cw" size={18} color={c.white} />
          <Text style={styles.refreshButtonText}>Refresh Ads</Text>
        </TouchableOpacity>

        {/* Ad slots */}
        {AD_SLOTS.map((slot) => {
          if (failedSlots.has(slot.label)) return null;
          return (
            <View key={`${slot.label}-${refreshKey}`} style={styles.adCard}>
              <BannerAd
                unitId={AD_UNIT_IDS.BANNER}
                size={slot.size}
                requestOptions={requestOptions}
                onAdLoaded={() =>
                  console.log(`[SupportDev] Ad LOADED: ${slot.label} (${slot.size})`)
                }
                onAdFailedToLoad={(error) => handleAdFailed(slot.label, error)}
              />
            </View>
          );
        })}

        {/* Support message */}
        <View style={styles.supportCard}>
          <Feather name="heart" size={20} color={c.teal} />
          <Text style={styles.supportText}>
            Ads help keep MediTrack free for everyone. Thank you for your support!
          </Text>
        </View>

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
      alignItems: 'center',
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: borderRadius.lg,
      backgroundColor: c.teal,
      alignSelf: 'stretch',
      marginBottom: 20,
      ...shadows.sm,
    },
    refreshButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.white,
    },
    adCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 8,
      marginBottom: 16,
      alignItems: 'center',
      alignSelf: 'stretch',
      overflow: 'hidden',
      ...shadows.sm,
    },
    supportCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: 16,
      alignSelf: 'stretch',
      marginTop: 4,
      ...shadows.sm,
    },
    supportText: {
      flex: 1,
      fontSize: 14,
      color: c.gray600,
      lineHeight: 20,
    },
  });
}
