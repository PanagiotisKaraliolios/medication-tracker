import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { type ColorScheme, borderRadius } from './theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { InteractionResult } from '../../types/drug';

interface InteractionWarningProps {
  interactions: InteractionResult[];
  compact?: boolean;
}

const SEVERITY_CONFIG = {
  high: { icon: 'alert-triangle' as const, label: 'Serious' },
  moderate: { icon: 'alert-circle' as const, label: 'Moderate' },
  low: { icon: 'info' as const, label: 'Minor' },
};

export function InteractionWarning({ interactions, compact = false }: InteractionWarningProps) {
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [expanded, setExpanded] = useState(false);

  if (interactions.length === 0) return null;

  const highCount = interactions.filter(i => i.severity === 'high').length;
  const sorted = [...interactions].sort((a, b) => {
    const order = { high: 0, moderate: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  const severityColor = highCount > 0 ? c.error : c.warning;
  const severityBg = highCount > 0 ? c.errorLight : c.warningLight;

  if (compact) {
    return (
      <View style={[styles.compactBanner, { backgroundColor: severityBg }]}>
        <Feather name="alert-triangle" size={14} color={severityColor} />
        <Text style={[styles.compactText, { color: severityColor }]}>
          {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: severityBg, borderColor: severityColor }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Feather name="alert-triangle" size={18} color={severityColor} />
        <Text style={[styles.title, { color: severityColor }]}>
          {interactions.length} Drug Interaction{interactions.length !== 1 ? 's' : ''} Found
        </Text>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={severityColor}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.details}>
          {sorted.map((interaction, idx) => {
            const config = SEVERITY_CONFIG[interaction.severity];
            const itemColor = interaction.severity === 'high' ? c.error : c.warning;
            return (
              <View key={idx} style={styles.interactionItem}>
                <View style={styles.interactionHeader}>
                  <Feather name={config.icon} size={14} color={itemColor} />
                  <Text style={[styles.interactionDrugs, { color: c.gray900 }]}>
                    {interaction.drug1} ↔ {interaction.drug2}
                  </Text>
                  <View style={[styles.severityBadge, { backgroundColor: itemColor }]}>
                    <Text style={styles.severityText}>{config.label}</Text>
                  </View>
                </View>
                <Text style={styles.interactionDesc}>{interaction.description}</Text>
                <Text style={styles.interactionSource}>{interaction.source}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 14,
    },
    title: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
    },
    details: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      gap: 12,
    },
    interactionItem: {
      backgroundColor: c.background,
      borderRadius: borderRadius.md,
      padding: 12,
    },
    interactionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    interactionDrugs: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },
    severityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: borderRadius.round,
    },
    severityText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    interactionDesc: {
      fontSize: 13,
      color: c.gray600,
      lineHeight: 18,
    },
    interactionSource: {
      fontSize: 11,
      color: c.gray400,
      marginTop: 4,
    },
    compactBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
    },
    compactText: {
      fontSize: 12,
      fontWeight: '600',
    },
  });
}
