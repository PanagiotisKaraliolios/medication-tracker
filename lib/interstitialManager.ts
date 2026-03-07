import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from './ads';
import { useAdPreferences } from '../stores/adPreferencesStore';

const MIN_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes between interstitials

let interstitial: InterstitialAd | null = null;
let adLoaded = false;
let lastShownAt = 0;

function getOrCreateAd(): InterstitialAd {
  if (!interstitial) {
    interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);

    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      adLoaded = true;
    });

    interstitial.addAdEventListener(AdEventType.ERROR, () => {
      adLoaded = false;
    });

    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      adLoaded = false;
      // Auto-reload for next trigger
      interstitial?.load();
    });
  }
  return interstitial;
}

/** Preload the interstitial ad. Call once at app startup. */
export function preloadInterstitial(): void {
  getOrCreateAd().load();
}

/**
 * Show interstitial if loaded and frequency cap allows it.
 * Returns a promise that resolves when the ad is closed (or immediately if not shown).
 * @param onClosed - callback invoked after ad closes or if ad wasn't shown
 */
export function showInterstitial(onClosed?: () => void): void {
  if (!useAdPreferences.getState().interstitials) {
    onClosed?.();
    return;
  }

  const now = Date.now();
  const ad = getOrCreateAd();

  if (adLoaded && now - lastShownAt >= MIN_INTERVAL_MS) {
    lastShownAt = now;

    // One-time close listener for this show
    const unsub = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsub();
      onClosed?.();
    });

    ad.show();
  } else {
    // Ad not ready or cooldown active — proceed immediately
    onClosed?.();
  }
}
