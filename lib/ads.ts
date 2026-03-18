import mobileAds, {
  AdsConsent,
  AdsConsentStatus,
  MaxAdContentRating,
  TestIds,
} from 'react-native-google-mobile-ads';

// ─── Ad Unit IDs ─────────────────────────────────────────────────────

const USE_TEST_ADS = __DEV__;

export const AD_UNIT_IDS = {
  BANNER: USE_TEST_ADS ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-2807646854687473/9213973864',
  INTERSTITIAL: USE_TEST_ADS ? TestIds.INTERSTITIAL : 'ca-app-pub-2807646854687473/2445860895',
  APP_OPEN: USE_TEST_ADS ? TestIds.APP_OPEN : 'ca-app-pub-2807646854687473/6256552313',
} as const;

// ─── Consent ─────────────────────────────────────────────────────────

let consentObtained = false;

export function canShowPersonalizedAds(): boolean {
  return consentObtained;
}

async function requestConsent(): Promise<void> {
  try {
    await AdsConsent.requestInfoUpdate();
    const result = await AdsConsent.loadAndShowConsentFormIfRequired();
    consentObtained =
      result.status === AdsConsentStatus.OBTAINED ||
      result.status === AdsConsentStatus.NOT_REQUIRED;
  } catch (err) {
    console.warn('[Ads] Consent request failed:', err);
    // Fall back to non-personalized ads
    consentObtained = false;
  }
}

// ─── Initialization ──────────────────────────────────────────────────

export async function initializeAds(): Promise<void> {
  try {
    console.log('[Ads] Starting initialization... (testAds:', USE_TEST_ADS, ')');
    await requestConsent();
    console.log('[Ads] Consent done, personalizedAds:', consentObtained);
    await mobileAds().initialize();
    console.log('[Ads] SDK initialized successfully');
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G,
    });
    console.log('[Ads] Request configuration set');
  } catch (err) {
    console.warn('[Ads] Failed to initialize:', err);
  }
}
