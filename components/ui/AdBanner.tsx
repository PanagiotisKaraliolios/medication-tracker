import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AD_UNIT_IDS } from '../../lib/ads';
import { type AdPreferences, useAdPreferences } from '../../stores/adPreferencesStore';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5_000, 15_000, 45_000]; // exponential backoff
const RECOVERY_DELAY = 120_000; // 2 minutes — final retry after all retries exhausted

type Props = {
  placement?: keyof AdPreferences;
};

export function AdBanner({ placement }: Props) {
  const enabled = useAdPreferences((s) => (placement ? s[placement] : true));

  const c = useThemeColors();
  const [failed, setFailed] = useState(false);
  const retryCount = useRef(0);
  const recoveryAttempted = useRef(false);
  const [retryKey, setRetryKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAdFailedToLoad = () => {
    if (retryCount.current < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount.current];
      retryCount.current += 1;
      timerRef.current = setTimeout(() => {
        setRetryKey((k) => k + 1);
      }, delay);
    } else if (!recoveryAttempted.current) {
      // One final recovery attempt after a longer delay
      recoveryAttempted.current = true;
      timerRef.current = setTimeout(() => {
        retryCount.current = 0;
        setRetryKey((k) => k + 1);
      }, RECOVERY_DELAY);
    } else {
      setFailed(true);
    }
  };

  if (failed || !enabled) return null;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BannerAd
        key={retryKey}
        unitId={AD_UNIT_IDS.BANNER}
        size={BannerAdSize.FULL_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
          networkExtras: { collapsible: 'bottom' },
        }}
        onAdLoaded={() => {
          retryCount.current = 0;
        }}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
});
