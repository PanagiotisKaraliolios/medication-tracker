import mobileAds, {
  AdsConsent,
  AdsConsentStatus,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';

// ─── Ad Unit IDs ─────────────────────────────────────────────────────

export const AD_UNIT_IDS = {
  BANNER: 'ca-app-pub-2807646854687473/9213973864',
  INTERSTITIAL: 'ca-app-pub-2807646854687473/2445860895',
  APP_OPEN: 'ca-app-pub-2807646854687473/6256552313',
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
    await requestConsent();
    await mobileAds().initialize();
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G,
    });
  } catch (err) {
    console.warn('[Ads] Failed to initialize:', err);
  }
}
