import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { borderRadius, type ColorScheme, gradients, shadows } from '../components/ui/theme';
import { useThemeColors } from '../hooks/useThemeColors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SUPPORT_EMAIL = 'karaliolios.panagiotis@gmail.com';
const PRIVACY_POLICY_URL =
  'https://github.com/PanagiotisKaraliolios/medication-tracker/blob/main/PRIVACY_POLICY.md';

type FAQItem = {
  question: string;
  answer: string;
};

const faqItems: FAQItem[] = [
  {
    question: 'How do I add a medication?',
    answer:
      'Go to the Today tab and tap the "+" button. Then tap on the "Add New Medication" option. Enter the medication name, dosage, form, and optionally supply details. Then tap Save.',
  },
  {
    question: 'How do I schedule reminders?',
    answer:
      'From the Today tab, tap the "+" button to create a new schedule. Select a medication, pick the frequency (daily, weekly, or interval), choose times, and enable push notifications on the reminders step.',
  },
  {
    question: 'How do I log a dose?',
    answer:
      'On the Today tab, your scheduled doses appear as cards. Tap the checkmark to mark as taken or the X button to skip. You can also undo a logged dose by tapping the undo button.',
  },
  {
    question: 'How do I edit or delete a medication?',
    answer:
      'Go to the Medications tab, tap on the medication you want to modify. From the detail screen you can edit or delete the medication and its schedules.',
  },
  {
    question: 'How does snooze work?',
    answer:
      "When you receive a dose reminder notification, you can snooze it. The dose card will show a countdown timer. Once the snooze expires, you'll be reminded again.",
  },
  {
    question: 'How is my adherence calculated?',
    answer:
      'Adherence is calculated over the last 30 days. It shows the percentage of scheduled doses that were logged as taken versus the total expected doses.',
  },
  {
    question: 'Can I export my data?',
    answer:
      'Yes! Go to Profile → Privacy & Security → Export My Data. Your medications, schedules, and dose logs will be exported as a JSON file you can share.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'Go to Profile → Privacy & Security → Delete Account. This will permanently remove your account and all associated data. This action cannot be undone.',
  },
];

export default function HelpSupportScreen() {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  const handleEmailSupport = async () => {
    const subject = encodeURIComponent('MediTrack Support Request');
    const body = encodeURIComponent(`\n\n---\nApp: MediTrack v1.3.0\nPlatform: ${Platform.OS}`);
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Toast.show({
        type: 'error',
        text1: 'No email app',
        text2: `Please email us at ${SUPPORT_EMAIL}`,
      });
    }
  };

  const handlePrivacyPolicy = () => {
    WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[...gradients.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color={c.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>Find answers or get in touch with us</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── FAQ ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="help-circle" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>

          <View style={styles.card}>
            {faqItems.map((item, i) => {
              const isExpanded = expandedIndex === i;
              return (
                <React.Fragment key={item.question}>
                  {i > 0 && <View style={styles.divider} />}
                  <TouchableOpacity
                    style={styles.faqRow}
                    onPress={() => toggleFAQ(i)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                    <Feather
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={c.gray400}
                    />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.faqAnswerWrap}>
                      <Text style={styles.faqAnswer}>{item.answer}</Text>
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* ── Contact ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="mail" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Contact Us</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleEmailSupport}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Feather name="send" size={18} color={c.teal} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Email Support</Text>
                <Text style={styles.actionSubtitle}>{SUPPORT_EMAIL}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={c.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Legal ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="file-text" size={18} color={c.gray600} />
            <Text style={styles.sectionTitle}>Legal</Text>
          </View>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handlePrivacyPolicy}
              activeOpacity={0.7}
            >
              <View style={styles.actionIcon}>
                <Feather name="shield" size={18} color={c.teal} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Privacy Policy</Text>
                <Text style={styles.actionSubtitle}>How we handle your data</Text>
              </View>
              <Feather name="chevron-right" size={20} color={c.gray400} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── App Info ── */}
        <View style={styles.infoCard}>
          <Feather name="info" size={18} color={c.gray400} />
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoLabel}>MediTrack v1.3.0</Text>
            <Text style={styles.infoSubtitle}>Made with care for your health</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingTop: 56,
      paddingHorizontal: 24,
      paddingBottom: 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: c.white,
    },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      marginTop: 4,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray900,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      ...shadows.sm,
      overflow: 'hidden',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.gray200,
      marginHorizontal: 16,
    },

    /* ── FAQ ── */
    faqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    faqQuestion: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: c.gray900,
    },
    faqAnswerWrap: {
      paddingHorizontal: 16,
      paddingBottom: 14,
    },
    faqAnswer: {
      fontSize: 13,
      lineHeight: 20,
      color: c.gray500,
    },

    /* ── Action rows ── */
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${c.teal}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: {
      flex: 1,
    },
    actionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray900,
    },
    actionSubtitle: {
      fontSize: 12,
      color: c.gray500,
      marginTop: 2,
    },

    /* ── App info ── */
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
    },
    infoTextWrap: {
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.gray400,
    },
    infoSubtitle: {
      fontSize: 12,
      color: c.gray300,
      marginTop: 2,
    },
  });
}
