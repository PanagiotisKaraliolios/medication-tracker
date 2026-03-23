import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useSyncExternalStore } from 'react';

// ── Shared network state singleton ──────────────────────────────────
let currentState: NetInfoState | null = null;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  const unsubscribe = NetInfo.addEventListener((state) => {
    currentState = state;
    for (const l of listeners) l();
  });
  return () => {
    listeners.delete(callback);
    unsubscribe();
  };
}

function getSnapshot() {
  return currentState;
}

// ── Hook ────────────────────────────────────────────────────────────

export function useNetworkStatus() {
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return {
    isConnected: state?.isConnected ?? null,
    isInternetReachable: state?.isInternetReachable ?? null,
  };
}
