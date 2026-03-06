import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { Button } from '../../components/ui/Button';
import { type ColorScheme, gradients, borderRadius } from '../../components/ui/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useMedicationDraft, useScheduleDraft } from '../../stores/draftStores';
import { AD_UNIT_IDS } from '../../lib/ads';

const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.INTERSTITIAL);

export default function SuccessScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { resetDraft } = useMedicationDraft();
  const { resetScheduleDraft, schedulingMedId } = useScheduleDraft();
  const isScheduling = !!schedulingMedId;

  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    const loadListener = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });
    const closeListener = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      navigateToDashboard();
    });

    interstitial.load();

    return () => {
      loadListener();
      closeListener();
    };
  }, []);

  const navigateToDashboard = () => {
    resetDraft();
    resetScheduleDraft();
    router.replace('/(tabs)');
  };

  const handleDone = () => {
    if (adLoaded) {
      interstitial.show();
    } else {
      navigateToDashboard();
    }
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
            ? 'Your medication schedule has been updated. You\'ll receive reminders at your set times.'
            : 'Your medication has been saved. You can set up a schedule from the Today tab whenever you\'re ready.'}
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

function makeStyles(c: ColorScheme) {
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
      paddingBottom: 40,
    },
  });
}
