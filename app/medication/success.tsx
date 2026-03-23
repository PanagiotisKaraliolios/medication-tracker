import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { type ColorScheme, gradients } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { showInterstitial } from '../../lib/interstitialManager';
import { useMedicationDraft, useScheduleDraft } from '../../stores/draftStores';

export default function SuccessScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(c, insets.bottom), [c, insets.bottom]);
  const resetDraft = useMedicationDraft((s) => s.resetDraft);
  const resetScheduleDraft = useScheduleDraft((s) => s.resetScheduleDraft);
  const schedulingMedId = useScheduleDraft((s) => s.schedulingMedId);
  const isScheduling = !!schedulingMedId;

  const navigateToDashboard = useCallback(() => {
    resetDraft();
    resetScheduleDraft();
    router.replace('/(tabs)');
  }, [resetDraft, resetScheduleDraft, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigateToDashboard();
      return true;
    });
    return () => sub.remove();
  }, [navigateToDashboard]);

  const handleDone = () => {
    showInterstitial(navigateToDashboard);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Feather name="check" size={48} color={c.white} />
        </LinearGradient>

        <Text style={styles.title}>{isScheduling ? 'Schedule Updated!' : 'Medication Added!'}</Text>
        <Text style={styles.message}>
          {isScheduling
            ? "Your medication schedule has been updated. You'll receive reminders at your set times."
            : "Your medication has been saved. You can set up a schedule from the Today tab whenever you're ready."}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button variant="primary" onPress={handleDone}>
          Back to Dashboard
        </Button>
      </View>
    </View>
  );
}

function makeStyles(c: ColorScheme, bottomInset: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
    },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 28,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: c.gray900,
      marginBottom: 12,
    },
    message: {
      fontSize: 15,
      color: c.gray500,
      textAlign: 'center',
      lineHeight: 22,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: Math.max(40, bottomInset + 16),
    },
  });
}
