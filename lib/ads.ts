import mobileAds, { TestIds } from 'react-native-google-mobile-ads';

// ─── Ad Unit IDs ─────────────────────────────────────────────────────
// Replace these with your real AdMob unit IDs before production.
// Test IDs are used by default so development builds show test ads.

export const AD_UNIT_IDS = {
  BANNER: 'ca-app-pub-2807646854687473/9213973864',
  INTERSTITIAL: 'ca-app-pub-2807646854687473/2445860895',
} as const;

// ─── Initialization ──────────────────────────────────────────────────

export function initializeAds() {
  mobileAds()
    .initialize()
    .catch((err) => console.warn('[Ads] Failed to initialize:', err));
}
