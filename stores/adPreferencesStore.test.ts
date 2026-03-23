import AsyncStorage from '@react-native-async-storage/async-storage';
import { areAdPreferencesLoaded, useAdPreferences } from './adPreferencesStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const allTrueKeys = [
  'todayBanner',
  'medicationsBanner',
  'reportsBanner',
  'profileBanner',
  'medicationDetailBanner',
  'notificationsBanner',
  'notificationSettingsBanner',
  'interstitials',
  'appOpenAds',
] as const;

const allTrue = Object.fromEntries(allTrueKeys.map((k) => [k, true]));

beforeEach(() => {
  useAdPreferences.setState({ ...allTrue });
  jest.clearAllMocks();
});

describe('useAdPreferences', () => {
  it('starts with all placements enabled', () => {
    const state = useAdPreferences.getState();
    for (const key of allTrueKeys) {
      expect(state[key]).toBe(true);
    }
  });

  it('toggle flips a single key', () => {
    useAdPreferences.getState().toggle('todayBanner');
    expect(useAdPreferences.getState().todayBanner).toBe(false);

    useAdPreferences.getState().toggle('todayBanner');
    expect(useAdPreferences.getState().todayBanner).toBe(true);
  });

  it('toggle persists to AsyncStorage', () => {
    useAdPreferences.getState().toggle('interstitials');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('"interstitials":false'),
    );
  });

  it('enableAll sets all to true and persists', () => {
    useAdPreferences.setState({ todayBanner: false, interstitials: false });
    useAdPreferences.getState().enableAll();
    for (const key of allTrueKeys) {
      expect(useAdPreferences.getState()[key]).toBe(true);
    }
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('disableAll sets all to false and persists', () => {
    useAdPreferences.getState().disableAll();
    for (const key of allTrueKeys) {
      expect(useAdPreferences.getState()[key]).toBe(false);
    }
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it('load reads saved preferences from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ todayBanner: false, interstitials: false }),
    );
    await useAdPreferences.getState().load();
    expect(useAdPreferences.getState().todayBanner).toBe(false);
    expect(useAdPreferences.getState().interstitials).toBe(false);
    expect(useAdPreferences.getState().reportsBanner).toBe(true);
  });

  it('load handles null (no stored data)', async () => {
    await useAdPreferences.getState().load();
    for (const key of allTrueKeys) {
      expect(useAdPreferences.getState()[key]).toBe(true);
    }
  });

  it('load handles AsyncStorage error gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    await useAdPreferences.getState().load();
    expect(useAdPreferences.getState().todayBanner).toBe(true);
  });
});

describe('areAdPreferencesLoaded', () => {
  it('returns true after load()', async () => {
    await useAdPreferences.getState().load();
    expect(areAdPreferencesLoaded()).toBe(true);
  });
});
