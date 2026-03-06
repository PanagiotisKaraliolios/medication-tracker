import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../../lib/ads';
import { useThemeColors } from '../../hooks/useThemeColors';

export function AdBanner() {
  const c = useThemeColors();
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BannerAd
        unitId={AD_UNIT_IDS.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => console.log('[AdBanner] Ad loaded successfully')}
        onAdFailedToLoad={(error) => {
          console.warn('[AdBanner] Ad failed to load:', error);
          setFailed(true);
        }}
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
