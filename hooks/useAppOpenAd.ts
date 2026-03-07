import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { AppOpenAd, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../lib/ads';
import { useAdPreferences } from '../stores/adPreferencesStore';

const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes between App Open ads

const appOpenAd = AppOpenAd.createForAdRequest(AD_UNIT_IDS.APP_OPEN);

let adLoaded = false;
let lastShownAt = 0;

// Preload on module init
function preload() {
  adLoaded = false;
  appOpenAd.load();
}

const loadListener = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
  adLoaded = true;
});

const errorListener = appOpenAd.addAdEventListener(AdEventType.ERROR, () => {
  adLoaded = false;
});

const closedListener = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
  adLoaded = false;
  preload();
});

preload();

/**
 * Shows an App Open ad when the app returns from background.
 * Frequency-capped to once per 5 minutes.
 * Only call this hook once in the root layout for authenticated users.
 */
export function useAppOpenAd() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        const now = Date.now();
        if (
          adLoaded &&
          now - lastShownAt >= MIN_INTERVAL_MS &&
          useAdPreferences.getState().appOpenAds
        ) {
          lastShownAt = now;
          appOpenAd.show();
        }
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);
}
