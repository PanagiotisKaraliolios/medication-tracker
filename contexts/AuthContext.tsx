import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { PROFILE_CACHE_KEY } from '../constants/storage';
import { AlertDialog } from '../components/ui/AlertDialog';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  hasProfile: boolean | null;
  profileName: string | null;
  profileDateOfBirth: string | null;
  checkProfile: (userId?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  hasProfile: null,
  profileName: null,
  profileDateOfBirth: null,
  checkProfile: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileDateOfBirth, setProfileDateOfBirth] = useState<string | null>(null);
  const isUserSignOut = useRef(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const checkProfile = async (userId?: string) => {
    const uid = userId || user?.id;
    if (!uid) {
      setHasProfile(null);
      setProfileName(null);
      setProfileDateOfBirth(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('id, full_name, date_of_birth').eq('id', uid).single();
    if (data) {
      setHasProfile(true);
      setProfileName(data.full_name ?? null);
      setProfileDateOfBirth(data.date_of_birth ?? null);
      // Cache profile for offline fallback
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
        hasProfile: true,
        fullName: data.full_name ?? null,
        dateOfBirth: data.date_of_birth ?? null,
      }));
    } else if (error && error.code !== 'PGRST116') {
      // Network/server error (not "row not found") — try cached profile
      try {
        const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setHasProfile(parsed.hasProfile);
          setProfileName(parsed.fullName);
          setProfileDateOfBirth(parsed.dateOfBirth ?? null);
          return;
        }
      } catch {}
      // No cache available — keep hasProfile as null (loading state) rather than false
      setHasProfile(null);
    } else {
      // PGRST116 (row not found) or no data — user genuinely has no profile
      setHasProfile(false);
      setProfileName(null);
      setProfileDateOfBirth(null);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error && error.message?.includes('Refresh Token')) {
        setSessionExpired(true);
        supabase.auth.signOut();
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !isUserSignOut.current) {
        setSessionExpired(true);
      }
      isUserSignOut.current = false;

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id).then(() => setLoading(false));
      } else {
        setHasProfile(null);
        setProfileName(null);
        setProfileDateOfBirth(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    isUserSignOut.current = true;
    queryClient.clear();
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    await Notifications.cancelAllScheduledNotificationsAsync();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, hasProfile, profileName, profileDateOfBirth, checkProfile, signOut }}>
      {children}
      <AlertDialog
        visible={sessionExpired}
        onClose={() => setSessionExpired(false)}
        title="Session Expired"
        message="Your session has expired. Please log in again."
        variant="warning"
        icon="log-in"
        cancelLabel="OK"
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
