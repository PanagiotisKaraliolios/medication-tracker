import { renderHook, act } from '@testing-library/react-native';

/* ── NetInfo mock ─────────────────────────────────────────────────── */
type NetInfoCallback = (state: { isConnected?: boolean; isInternetReachable?: boolean }) => void;

const mockUnsubscribe = jest.fn();
const mockAddEventListener = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (...args: unknown[]) => mockAddEventListener(...args),
  },
}));

import { useNetworkStatus } from './useNetworkStatus';

let capturedCallbacks: NetInfoCallback[];

beforeEach(() => {
  jest.clearAllMocks();
  capturedCallbacks = [];
  mockAddEventListener.mockImplementation((cb: NetInfoCallback) => {
    capturedCallbacks.push(cb);
    return mockUnsubscribe;
  });
});

describe('useNetworkStatus', () => {
  it('returns null for both values initially', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isConnected).toBeNull();
    expect(result.current.isInternetReachable).toBeNull();
  });

  it('reflects connected state after NetInfo event', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // The subscribe function calls addEventListener which stores cb in capturedCallbacks
    const cb = capturedCallbacks[capturedCallbacks.length - 1];
    act(() => {
      cb({ isConnected: true, isInternetReachable: true });
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
  });

  it('reflects disconnected state after NetInfo event', () => {
    const { result } = renderHook(() => useNetworkStatus());

    const cb = capturedCallbacks[capturedCallbacks.length - 1];
    act(() => {
      cb({ isConnected: false, isInternetReachable: false });
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
  });

  it('returns null for isInternetReachable when undefined in state', () => {
    const { result } = renderHook(() => useNetworkStatus());

    const cb = capturedCallbacks[capturedCallbacks.length - 1];
    act(() => {
      cb({ isConnected: true });
    });

    expect(result.current.isInternetReachable).toBeNull();
  });

  it('calls unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('shares singleton state across multiple hooks', () => {
    const { result: result1 } = renderHook(() => useNetworkStatus());
    const { result: result2 } = renderHook(() => useNetworkStatus());

    // Use the latest captured callback (from the module-level addEventListener)
    const cb = capturedCallbacks[capturedCallbacks.length - 1];
    act(() => {
      cb({ isConnected: true, isInternetReachable: true });
    });

    expect(result1.current.isConnected).toBe(true);
    expect(result2.current.isConnected).toBe(true);
  });
});
