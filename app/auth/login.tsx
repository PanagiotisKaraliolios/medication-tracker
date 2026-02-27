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

export default function LoginScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter email and password'
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Logged in successfully'
      });
    }
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
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color={c.gray900} />
        </TouchableOpacity>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue managing your medications</Text>

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

          <TouchableOpacity style={styles.forgotLink} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Button variant="primary" onPress={handleLogin} loading={loading}>
            Log In
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
          style={styles.signupLink}
          onPress={() => router.push('/auth/signup')}
          activeOpacity={0.7}
        >
          <Text style={styles.signupText}>
            Don't have an account? <Text style={styles.signupTextBold}>Sign Up</Text>
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
    forgotLink: {
      alignSelf: 'flex-end',
      marginTop: -4,
    },
    forgotText: {
      fontSize: 14,
      color: c.teal,
      fontWeight: '500',
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
    signupLink: {
      alignItems: 'center',
      marginTop: 24,
    },
    signupText: {
      fontSize: 15,
      color: c.gray600,
    },
    signupTextBold: {
      color: c.teal,
      fontWeight: '600',
    },
  });
}
