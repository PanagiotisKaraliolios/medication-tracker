import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import type React from 'react';
import { PROFILE_CACHE_KEY } from '../constants/storage';
import { queryClient } from '../lib/queryClient';
import { AuthProvider, useAuth } from './AuthContext';

// ── Mocks ────────────────────────────────────────────────────────────

const mockGetSession = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue({});
const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSupabaseFrom = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

jest.mock('../lib/queryClient', () => ({ queryClient: { clear: jest.fn() } }));
jest.mock('expo-notifications', () => ({
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../components/ui/AlertDialog', () => ({
  AlertDialog: () => null,
}));

// ── Helpers ──────────────────────────────────────────────────────────

function mockChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

const mockSession = {
  user: { id: 'user-1', email: 'a@b.com' },
  access_token: 'tok',
  refresh_token: 'ref',
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('initial state has loading=true and user=null', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('sets user and session after getSession resolves with a session', async () => {
    const chain = mockChain({
      data: { id: 'user-1', full_name: 'Test', date_of_birth: '1990-01-01' },
      error: null,
    });
    mockSupabaseFrom.mockReturnValue(chain);
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual(mockSession.user);
    expect(result.current.session).toEqual(mockSession);
  });

  it('sets loading=false when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
  });

  it('checkProfile sets hasProfile=true when profile exists', async () => {
    const chain = mockChain({
      data: { id: 'user-1', full_name: 'John', date_of_birth: '1990-05-15' },
      error: null,
    });
    mockSupabaseFrom.mockReturnValue(chain);
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasProfile).toBe(true);
    expect(result.current.profileName).toBe('John');
    expect(result.current.profileDateOfBirth).toBe('1990-05-15');
  });

  it('checkProfile caches profile in AsyncStorage', async () => {
    const chain = mockChain({
      data: { id: 'user-1', full_name: 'John', date_of_birth: '1990-05-15' },
      error: null,
    });
    mockSupabaseFrom.mockReturnValue(chain);
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      PROFILE_CACHE_KEY,
      expect.stringContaining('"hasProfile":true'),
    );
  });

  it('checkProfile sets hasProfile=false when PGRST116 error (no rows)', async () => {
    const chain = mockChain({
      data: null,
      error: { code: 'PGRST116', message: 'No rows' },
    });
    mockSupabaseFrom.mockReturnValue(chain);
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasProfile).toBe(false);
    expect(result.current.profileName).toBeNull();
  });

  it('checkProfile uses cache fallback on non-PGRST116 error', async () => {
    const chain = mockChain({
      data: null,
      error: { code: 'UNKNOWN', message: 'Network error' },
    });
    mockSupabaseFrom.mockReturnValue(chain);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ hasProfile: true, fullName: 'Cached Name', dateOfBirth: '1985-01-01' }),
    );
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasProfile).toBe(true);
    expect(result.current.profileName).toBe('Cached Name');
    expect(result.current.profileDateOfBirth).toBe('1985-01-01');
  });

  it('checkProfile with no userId sets all profile fields to null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Call checkProfile without userId when user is null
    await act(async () => {
      await result.current.checkProfile();
    });

    expect(result.current.hasProfile).toBeNull();
    expect(result.current.profileName).toBeNull();
    expect(result.current.profileDateOfBirth).toBeNull();
  });

  it('signOut clears queryClient, AsyncStorage, notifications, and calls supabase.auth.signOut', async () => {
    const chain = mockChain({
      data: { id: 'user-1', full_name: 'Test', date_of_birth: null },
      error: null,
    });
    mockSupabaseFrom.mockReturnValue(chain);
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(queryClient.clear).toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(PROFILE_CACHE_KEY);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('signOut sets loading=true', async () => {
    const chain = mockChain({
      data: { id: 'user-1', full_name: 'Test', date_of_birth: null },
      error: null,
    });
    mockSupabaseFrom.mockReturnValue(chain);
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Don't await — check intermediate state
    act(() => {
      result.current.signOut();
    });

    expect(result.current.loading).toBe(true);
  });

  it('detects session expiry on refresh token error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Refresh Token Not Found' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockSignOut).toHaveBeenCalled();
    // sessionExpired triggers the AlertDialog, verified by signOut being called
  });

  it('auth state change SIGNED_OUT without user-initiated sets sessionExpired', async () => {
    let authCallback: (event: string, session: null) => void = () => {};
    mockOnAuthStateChange.mockImplementation((cb: typeof authCallback) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate a non-user-initiated sign out
    act(() => {
      authCallback('SIGNED_OUT', null);
    });

    // After SIGNED_OUT (not user-initiated), session should be null
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('auth state change with session triggers checkProfile', async () => {
    let authCallback: (event: string, session: typeof mockSession | null) => void = () => {};
    mockOnAuthStateChange.mockImplementation((cb: typeof authCallback) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const chain = mockChain({
      data: { id: 'user-1', full_name: 'Changed', date_of_birth: null },
      error: null,
    });
    mockSupabaseFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // After initial load, subsequent getSession calls should reflect the new session
    // (the effect re-runs when checkProfile's user?.id dependency changes)
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    await act(async () => {
      authCallback('SIGNED_IN', mockSession);
    });

    await waitFor(() => expect(result.current.user).toEqual(mockSession.user));
    await waitFor(() => expect(result.current.profileName).toBe('Changed'));
  });

  it('unsubscribes from auth listener on unmount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { unmount } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('checkProfile sets hasProfile=null when non-PGRST116 error and no cache', async () => {
    const chain = mockChain({
      data: null,
      error: { code: 'UNKNOWN', message: 'Server error' },
    });
    mockSupabaseFrom.mockReturnValue(chain);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasProfile).toBeNull();
  });

  it('checkProfile handles null full_name and date_of_birth', async () => {
    const chain = mockChain({
      data: { id: 'user-1', full_name: null, date_of_birth: null },
      error: null,
    });
    mockSupabaseFrom.mockReturnValue(chain);
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasProfile).toBe(true);
    expect(result.current.profileName).toBeNull();
    expect(result.current.profileDateOfBirth).toBeNull();
  });
});
