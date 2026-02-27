import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, darkColors, type ColorScheme } from '../components/ui/theme';

const THEME_KEY = '@meditrack_theme';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextType = {
  /** The user's stored preference */
  preference: ThemePreference;
  /** The resolved scheme after applying the preference */
  resolvedScheme: 'light' | 'dark';
  /** The active color palette */
  colors: ColorScheme;
  /** Update preference (persisted to AsyncStorage) */
  setPreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  preference: 'system',
  resolvedScheme: 'light',
  colors,
  setPreference: () => {},
});

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(THEME_KEY, pref);
  }, []);

  const resolvedScheme: 'light' | 'dark' =
    preference === 'system'
      ? (systemScheme ?? 'light')
      : preference;

  const value: ThemeContextType = {
    preference,
    resolvedScheme,
    colors: resolvedScheme === 'dark' ? darkColors : colors,
    setPreference,
  };

  // Don't render until we've loaded the persisted preference to avoid flash
  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemeContext);
}
