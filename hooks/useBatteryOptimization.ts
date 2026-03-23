import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import Constants from 'expo-constants';
import { ActivityAction, startActivityAsync } from 'expo-intent-launcher';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { BATTERY_OPT_DISMISSED_KEY } from '../constants/storage';

/**
 * Hook that checks whether battery optimization is enabled for this app
 * on Android and manages the dismiss state for the prompt modal.
 *
 * Returns:
 *  - `shouldShowModal`: true when the user should be prompted
 *  - `openBatterySettings`: opens the system dialog to disable battery optimization
 *  - `dismissModal`: hides the modal and persists "don't show again"
 *  - `recheckOptimization`: manually re-check after returning from settings
 */
export function useBatteryOptimization() {
  const [optimizationEnabled, setOptimizationEnabled] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden
  const [checked, setChecked] = useState(false);

  const checkOptimization = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      const isEnabled = await Battery.isBatteryOptimizationEnabledAsync();
      setOptimizationEnabled(isEnabled);

      if (isEnabled) {
        const wasDismissed = await AsyncStorage.getItem(BATTERY_OPT_DISMISSED_KEY);
        setDismissed(wasDismissed === 'true');
      } else {
        // Already unrestricted — no need to show
        setDismissed(true);
      }
    } catch {
      // Silently fail — don't block the app
      setDismissed(true);
    } finally {
      setChecked(true);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkOptimization();
  }, [checkOptimization]);

  // Re-check when app comes back to foreground (user may have changed settings)
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        checkOptimization();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [checkOptimization]);

  const openBatterySettings = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      const packageName =
        Constants.expoConfig?.android?.package ?? 'com.anonymous.medicationtracker';

      await startActivityAsync(ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, {
        data: `package:${packageName}`,
      });
    } catch {
      // Fallback: open the general battery optimization list
      try {
        await startActivityAsync(ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
      } catch {
        // Settings screen not available on this device
      }
    }
  }, []);

  const dismissModal = useCallback(async () => {
    setDismissed(true);
    try {
      await AsyncStorage.setItem(BATTERY_OPT_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage error
    }
  }, []);

  const shouldShowModal = Platform.OS === 'android' && checked && optimizationEnabled && !dismissed;

  return {
    shouldShowModal,
    /** Whether the OS-level battery optimization is active (i.e. app is restricted). */
    isOptimizationEnabled: optimizationEnabled,
    /** Whether the initial async check has completed. */
    isChecked: checked,
    /** Whether the platform is Android (battery optimization only applies there). */
    isAndroid: Platform.OS === 'android',
    openBatterySettings,
    dismissModal,
    recheckOptimization: checkOptimization,
  };
}
