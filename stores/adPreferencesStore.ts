import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AD_PREFERENCES_KEY } from '../constants/storage';

// ─── Types ───────────────────────────────────────────────────────────

export type AdPreferences = {
  todayBanner: boolean;
  medicationsBanner: boolean;
  reportsBanner: boolean;
  profileBanner: boolean;
  medicationDetailBanner: boolean;
  notificationsBanner: boolean;
  notificationSettingsBanner: boolean;
  interstitials: boolean;
  appOpenAds: boolean;
};

const defaultPreferences: AdPreferences = {
  todayBanner: true,
  medicationsBanner: true,
  reportsBanner: true,
  profileBanner: true,
  medicationDetailBanner: true,
  notificationsBanner: true,
  notificationSettingsBanner: true,
  interstitials: true,
  appOpenAds: true,
};

type AdPreferencesStore = AdPreferences & {
  /** Load persisted preferences from AsyncStorage. Call once at app startup. */
  load: () => Promise<void>;
  /** Toggle a single preference and persist. */
  toggle: (key: keyof AdPreferences) => void;
  /** Enable all ad placements and persist. */
  enableAll: () => void;
  /** Disable all ad placements and persist. */
  disableAll: () => void;
};

function persist(prefs: AdPreferences) {
  AsyncStorage.setItem(AD_PREFERENCES_KEY, JSON.stringify(prefs)).catch(() => {});
}

function pick(state: AdPreferencesStore): AdPreferences {
  const {
    todayBanner, medicationsBanner, reportsBanner, profileBanner,
    medicationDetailBanner, notificationsBanner, notificationSettingsBanner,
    interstitials, appOpenAds,
  } = state;
  return {
    todayBanner, medicationsBanner, reportsBanner, profileBanner,
    medicationDetailBanner, notificationsBanner, notificationSettingsBanner,
    interstitials, appOpenAds,
  };
}

export const useAdPreferences = create<AdPreferencesStore>((set, get) => ({
  ...defaultPreferences,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(AD_PREFERENCES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AdPreferences>;
        set({ ...defaultPreferences, ...parsed });
      }
    } catch {
      // Defaults are fine
    }
  },

  toggle: (key) => {
    set((s) => ({ [key]: !s[key] }));
    const prefs = pick(get());
    persist(prefs);
  },

  enableAll: () => {
    set({ ...defaultPreferences });
    persist(defaultPreferences);
  },

  disableAll: () => {
    const all: AdPreferences = {
      todayBanner: false,
      medicationsBanner: false,
      reportsBanner: false,
      profileBanner: false,
      medicationDetailBanner: false,
      notificationsBanner: false,
      notificationSettingsBanner: false,
      interstitials: false,
      appOpenAds: false,
    };
    set(all);
    persist(all);
  },
}));
