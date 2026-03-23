import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { AdEventType, AppOpenAd } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../lib/ads';
import { areAdPreferencesLoaded, useAdPreferences } from '../stores/adPreferencesStore';

const MIN_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes between App Open ads

const appOpenAd = AppOpenAd.createForAdRequest(AD_UNIT_IDS.APP_OPEN);

let adLoaded = false;
let lastShownAt = 0;

// Preload on module init
function preload() {
  adLoaded = false;
  appOpenAd.load();
}

const _loadListener = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
  adLoaded = true;
});

const _errorListener = appOpenAd.addAdEventListener(AdEventType.ERROR, () => {
  adLoaded = false;
});

const _closedListener = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
  adLoaded = false;
  preload();
});

preload();

function tryShowAd() {
  const now = Date.now();
  if (
    adLoaded &&
    now - lastShownAt >= MIN_INTERVAL_MS &&
    areAdPreferencesLoaded() &&
    useAdPreferences.getState().appOpenAds
  ) {
    lastShownAt = now;
    appOpenAd.show();
  }
}

/**
 * Shows an App Open ad on cold start and when the app returns from background.
 * Frequency-capped to once per 3 minutes.
 * Only call this hook once in the root layout for authenticated users.
 */
export function useAppOpenAd() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const coldStartHandled = useRef(false);

  // Cold-start: show ad once on initial mount
  useEffect(() => {
    if (coldStartHandled.current) return;
    coldStartHandled.current = true;

    // Wait briefly for ad to load if not ready yet
    if (adLoaded) {
      tryShowAd();
    } else {
      const unsub = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
        unsub();
        tryShowAd();
      });
    }
  }, []);

  // Background → foreground: show ad on app return
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        tryShowAd();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);
}
