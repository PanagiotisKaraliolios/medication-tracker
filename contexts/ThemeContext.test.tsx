import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import type React from 'react';
import { Appearance } from 'react-native';
import { colors, darkColors } from '../components/ui/theme';
import { ThemePreferenceProvider, useThemePreference } from './ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

const mockGetItem = jest.mocked(AsyncStorage.getItem);
const mockSetItem = jest.mocked(AsyncStorage.setItem);

function setColorScheme(scheme: 'light' | 'dark' | null) {
  jest.spyOn(Appearance, 'getColorScheme').mockReturnValue(scheme);
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemePreferenceProvider>{children}</ThemePreferenceProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  setColorScheme('light');
});

describe('ThemeContext', () => {
  it('defaults to system preference when AsyncStorage is empty', async () => {
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.preference).toBe('system');
    });
  });

  it('loads persisted dark preference from AsyncStorage', async () => {
    mockGetItem.mockResolvedValue('dark');
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.preference).toBe('dark');
    });
  });

  it('loads persisted light preference from AsyncStorage', async () => {
    mockGetItem.mockResolvedValue('light');
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.preference).toBe('light');
    });
  });

  it('ignores invalid stored value and defaults to system', async () => {
    mockGetItem.mockResolvedValue('invalid-value');
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.preference).toBe('system');
    });
  });

  it('setPreference updates preference and writes to AsyncStorage', async () => {
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.preference).toBe('system');
    });

    act(() => {
      result.current.setPreference('dark');
    });

    expect(result.current.preference).toBe('dark');
    expect(mockSetItem).toHaveBeenCalledWith('@meditrack_theme', 'dark');
  });

  it('resolves system preference to dark when useColorScheme returns dark', async () => {
    setColorScheme('dark');
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.resolvedScheme).toBe('dark');
    });
  });

  it('resolves system preference to light when useColorScheme returns null', async () => {
    setColorScheme(null);
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.resolvedScheme).toBe('light');
    });
  });

  it('returns darkColors when resolved scheme is dark', async () => {
    mockGetItem.mockResolvedValue('dark');
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.colors).toBe(darkColors);
    });
  });

  it('returns light colors when resolved scheme is light', async () => {
    mockGetItem.mockResolvedValue('light');
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.colors).toBe(colors);
    });
  });

  it('returns context default values before provider loads', () => {
    // Render without wrapper — uses context default
    const { result } = renderHook(() => useThemePreference());
    expect(result.current.preference).toBe('system');
    expect(result.current.resolvedScheme).toBe('light');
    expect(result.current.colors).toBe(colors);
  });

  it('setPreference updates resolvedScheme immediately', async () => {
    const { result } = renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(result.current.resolvedScheme).toBe('light');
    });

    act(() => {
      result.current.setPreference('dark');
    });

    expect(result.current.resolvedScheme).toBe('dark');
    expect(result.current.colors).toBe(darkColors);
  });

  it('reads from AsyncStorage with the correct key on mount', async () => {
    renderHook(() => useThemePreference(), { wrapper });
    await waitFor(() => {
      expect(mockGetItem).toHaveBeenCalledWith('@meditrack_theme');
    });
  });
});
