import { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * This screen exists only to catch the deep-link redirect from Supabase OAuth
 * (medication-tracker://google-callback). The actual token exchange is handled
 * by `openAuthSessionAsync` in privacy-security.tsx before this screen mounts.
 * If the user somehow lands here (e.g. error redirect), we just send them back.
 */
export default function GoogleCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // Give the auth session browser a moment to process, then navigate away
    const timer = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
