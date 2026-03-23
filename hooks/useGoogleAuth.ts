import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

// Configure Google Sign-In once at module level.
// The webClientId is required — it tells the native SDK to request an ID token
// that Supabase can verify. This must be the **Web** client ID from Google Cloud
// Console (not the Android or iOS client ID).
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  scopes: ['email', 'profile'],
});

/**
 * Hook that provides Google Sign-In functionality backed by Supabase.
 *
 * Usage:
 * ```tsx
 * const { signInWithGoogle, loading } = useGoogleAuth();
 * <Button onPress={signInWithGoogle} loading={loading}>Continue with Google</Button>
 * ```
 *
 * The flow:
 * 1. Native Google Sign-In SDK presents the account picker
 * 2. On success, we receive a Google ID token
 * 3. The ID token is exchanged with Supabase via `signInWithIdToken`
 * 4. Supabase creates/links the user and returns a session
 * 5. `AuthContext.onAuthStateChange` picks up the new session automatically
 *
 * Returns `{ error }` on failure so the caller can show a Toast.
 */
export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    try {
      setLoading(true);

      // Ensure Google Play Services are available (Android)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Present the native Google Sign-In UI
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // User cancelled — not an error
        return { error: null };
      }

      const idToken = response.data?.idToken;
      if (!idToken) {
        return { error: 'Google Sign-In did not return an ID token.' };
      }

      // Exchange the Google ID token for a Supabase session
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (err: unknown) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // User cancelled — not an error
            return { error: null };
          case statusCodes.IN_PROGRESS:
            return { error: 'Sign-in is already in progress.' };
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            return { error: 'Google Play Services is not available on this device.' };
          default:
            return { error: err.message || 'An unknown Google Sign-In error occurred.' };
        }
      }

      return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
    } finally {
      setLoading(false);
    }
  }, []);

  return { signInWithGoogle, loading };
}
