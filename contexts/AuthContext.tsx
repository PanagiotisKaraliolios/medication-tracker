import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { PROFILE_CACHE_KEY } from '../constants/storage';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  hasProfile: boolean | null;
  profileName: string | null;
  profileAge: number | null;
  checkProfile: (userId?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  hasProfile: null,
  profileName: null,
  profileAge: null,
  checkProfile: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAge, setProfileAge] = useState<number | null>(null);

  const checkProfile = async (userId?: string) => {
    const uid = userId || user?.id;
    if (!uid) {
      setHasProfile(null);
      setProfileName(null);
      setProfileAge(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('id, full_name, age').eq('id', uid).single();
    if (data) {
      setHasProfile(true);
      setProfileName(data.full_name ?? null);
      setProfileAge(data.age ?? null);
      // Cache profile for offline fallback
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
        hasProfile: true,
        fullName: data.full_name ?? null,
        age: data.age ?? null,
      }));
    } else if (error && error.code !== 'PGRST116') {
      // Network/server error (not "row not found") — try cached profile
      try {
        const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setHasProfile(parsed.hasProfile);
          setProfileName(parsed.fullName);
          setProfileAge(parsed.age);
          return;
        }
      } catch {}
      // No cache available — keep hasProfile as null (loading state) rather than false
      setHasProfile(null);
    } else {
      // PGRST116 (row not found) or no data — user genuinely has no profile
      setHasProfile(false);
      setProfileName(null);
      setProfileAge(null);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id).then(() => setLoading(false));
      } else {
        setHasProfile(null);
        setProfileName(null);
        setProfileAge(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    queryClient.clear();
    await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, hasProfile, profileName, profileAge, checkProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
