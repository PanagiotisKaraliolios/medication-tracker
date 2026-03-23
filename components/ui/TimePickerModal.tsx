import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { borderRadius, type ColorScheme, shadows } from './theme';

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (time: string) => void;
}

/** Format hour, minute, period into "h:mm AM/PM" */
function formatTime(hour: number, minute: number, period: 'AM' | 'PM'): string {
  return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
}

export function TimePickerModal({ visible, onClose, onConfirm }: TimePickerModalProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  const cycleHour = (dir: 1 | -1) => {
    setHour((prev) => {
      const next = prev + dir;
      if (next > 12) return 1;
      if (next < 1) return 12;
      return next;
    });
  };

  const cycleMinute = (dir: 1 | -1) => {
    setMinute((prev) => {
      const next = prev + dir * 5;
      if (next >= 60) return 0;
      if (next < 0) return 55;
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(formatTime(hour, minute, period));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              <Text style={styles.title}>Select Time</Text>

              <View style={styles.pickerRow}>
                {/* Hour */}
                <View style={styles.column}>
                  <TouchableOpacity
                    style={styles.arrowBtn}
                    onPress={() => cycleHour(1)}
                    activeOpacity={0.6}
                  >
                    <Feather name="chevron-up" size={24} color={c.gray500} />
                  </TouchableOpacity>
                  <Text style={styles.value}>{hour}</Text>
                  <TouchableOpacity
                    style={styles.arrowBtn}
                    onPress={() => cycleHour(-1)}
                    activeOpacity={0.6}
                  >
                    <Feather name="chevron-down" size={24} color={c.gray500} />
                  </TouchableOpacity>
                  <Text style={styles.label}>Hour</Text>
                </View>

                <Text style={styles.separator}>:</Text>

                {/* Minute */}
                <View style={styles.column}>
                  <TouchableOpacity
                    style={styles.arrowBtn}
                    onPress={() => cycleMinute(1)}
                    activeOpacity={0.6}
                  >
                    <Feather name="chevron-up" size={24} color={c.gray500} />
                  </TouchableOpacity>
                  <Text style={styles.value}>{minute.toString().padStart(2, '0')}</Text>
                  <TouchableOpacity
                    style={styles.arrowBtn}
                    onPress={() => cycleMinute(-1)}
                    activeOpacity={0.6}
                  >
                    <Feather name="chevron-down" size={24} color={c.gray500} />
                  </TouchableOpacity>
                  <Text style={styles.label}>Min</Text>
                </View>

                {/* AM / PM */}
                <View style={styles.periodColumn}>
                  <TouchableOpacity
                    style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
                    onPress={() => setPeriod('AM')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>
                      AM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
                    onPress={() => setPeriod('PM')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Preview */}
              {/* <Text style={styles.preview}>
                {formatTime(hour, minute, period)}
              </Text> */}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmText}>Add Time</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dialog: {
      width: '85%',
      gap: 24,
      maxWidth: 340,
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      padding: 24,
      ...shadows.lg,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.gray900,
      textAlign: 'center',
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    column: {
      alignItems: 'center',
      minWidth: 60,
    },
    arrowBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: c.gray100,
    },
    value: {
      fontSize: 36,
      fontWeight: '700',
      color: c.gray900,
      marginVertical: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: '500',
      color: c.gray400,
      marginTop: 2,
    },
    separator: {
      fontSize: 36,
      fontWeight: '700',
      color: c.gray900,
      marginBottom: 20,
    },
    periodColumn: {
      gap: 6,
      marginLeft: 8,
      marginBottom: 18,
    },
    periodBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: borderRadius.sm,
      backgroundColor: c.gray100,
    },
    periodBtnActive: {
      backgroundColor: c.teal,
    },
    periodText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.gray500,
    },
    periodTextActive: {
      color: c.white,
    },
    preview: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray500,
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 20,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: borderRadius.lg,
      backgroundColor: c.gray100,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.gray600,
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: borderRadius.lg,
      backgroundColor: c.teal,
      alignItems: 'center',
    },
    confirmText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.white,
    },
  });
}
