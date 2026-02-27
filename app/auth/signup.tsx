import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { type ColorScheme, borderRadius } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import Toast from 'react-native-toast-message';

export default function SignupScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter email and password' });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
      return;
    }

    // Supabase returns an empty identities array when the email is already registered
    if (data?.user?.identities?.length === 0) {
      Toast.show({ type: 'error', text1: 'Account exists', text2: 'An account with this email already exists. Please log in.' });
      return;
    }

    // If email confirmation is required, no session is created
    if (!data.session) {
      Toast.show({ type: 'info', text1: 'Check your email', text2: 'We sent you a confirmation link to verify your account.' });
      return;
    }

    // Session created — the auth redirect in _layout.tsx will navigate to profile-setup
    Toast.show({ type: 'success', text1: 'Success', text2: 'Account created successfully' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color={c.gray900} />
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start tracking your medications today</Text>

        <View style={styles.form}>
          <Input
            icon={<Feather name="mail" size={20} color={c.gray400} />}
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            icon={<Feather name="lock" size={20} color={c.gray400} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={c.gray400} />
              </TouchableOpacity>
            }
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <Input
            icon={<Feather name="lock" size={20} color={c.gray400} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} activeOpacity={0.7}>
                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={c.gray400} />
              </TouchableOpacity>
            }
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />

          <Button variant="primary" onPress={handleSignup} loading={loading}>
            Create Account
          </Button>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.googleButton} activeOpacity={0.7}>
          <Feather name="globe" size={20} color={c.gray900} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/auth/login')}
          activeOpacity={0.7}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginTextBold}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 40,
    },
    backButton: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: c.gray900,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: c.gray600,
      marginBottom: 32,
      lineHeight: 22,
    },
    form: {
      gap: 16,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: c.gray200,
    },
    dividerText: {
      fontSize: 13,
      color: c.gray500,
      fontWeight: '500',
      marginHorizontal: 16,
    },
    googleButton: {
      height: 56,
      borderRadius: borderRadius.lg,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.gray200,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    googleButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: c.gray900,
    },
    loginLink: {
      alignItems: 'center',
      marginTop: 24,
    },
    loginText: {
      fontSize: 15,
      color: c.gray600,
    },
    loginTextBold: {
      color: c.teal,
      fontWeight: '600',
    },
  });
}
