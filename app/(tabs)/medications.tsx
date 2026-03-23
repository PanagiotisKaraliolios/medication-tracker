import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MedicationDetailPanel } from '../../components/MedicationDetailPanel';
import { AdBanner } from '../../components/ui/AdBanner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { InteractionWarning } from '../../components/ui/InteractionWarning';
import { InventoryProgressBar } from '../../components/ui/InventoryProgressBar';
import { LoadingState } from '../../components/ui/LoadingState';
import {
  borderRadius,
  type ColorScheme,
  gradients,
  shadows,
  tablet as tabletLayout,
} from '../../components/ui/theme';
import { useDrugInteractions } from '../../hooks/useDrugSearch';
import { useMedications } from '../../hooks/useQueryHooks';
import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { MedicationRow } from '../../types/database';

export default function MedicationsScreen() {
  const c = useThemeColors();
  const { isTablet } = useResponsive();
  const styles = useMemo(() => makeStyles(c, isTablet), [c, isTablet]);
  const { data: medications = [], isLoading, error, refetch } = useMedications();
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);

  // Drug interaction checking
  const drugNames = useMemo(
    () => medications.map((m) => m.generic_name || m.name).filter(Boolean),
    [medications],
  );
  const { data: interactions = [] } = useDrugInteractions(drugNames);

  const interactionsByMed = useMemo(() => {
    const map = new Map<string, typeof interactions>();
    for (const med of medications) {
      const name = (med.generic_name || med.name).toLowerCase();
      const relevant = interactions.filter(
        (i) => i.drug1.toLowerCase() === name || i.drug2.toLowerCase() === name,
      );
      if (relevant.length > 0) map.set(med.id, relevant);
    }
    return map;
  }, [medications, interactions]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderMedCard = useCallback(
    ({ item: med }: { item: MedicationRow }) => {
      const isLow = med.current_supply <= (med.low_supply_threshold ?? 10);
      const isSelected = isTablet && selectedMedId === med.id;
      return (
        <Pressable
          style={[styles.cardWrapper, styles.card, isSelected && styles.cardSelected]}
          onPress={() => {
            if (isTablet) {
              setSelectedMedId(med.id);
            } else {
              router.push(`/medication/${med.id}`);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={`${med.name}, ${med.dosage}, ${med.form}${isLow ? ', low supply' : ''}`}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardInfo}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medDosage}>
                {med.dosage} · {med.form}
              </Text>
            </View>
            {med.is_prn && (
              <View style={styles.prnBadge}>
                <Feather name="zap" size={12} color={c.teal} />
                <Text style={styles.prnBadgeText}>PRN</Text>
              </View>
            )}
            {isLow && (
              <View style={styles.lowBadge}>
                <Feather name="alert-triangle" size={14} color={c.warning} />
                <Text style={styles.lowBadgeText}>Low</Text>
              </View>
            )}
          </View>

          <InventoryProgressBar
            current={med.current_supply}
            threshold={med.low_supply_threshold ?? 10}
          />

          {interactionsByMed.has(med.id) && (
            <View style={{ marginTop: 8 }}>
              <InteractionWarning interactions={interactionsByMed.get(med.id) ?? []} compact />
            </View>
          )}

          <View style={styles.cardBottom}>
            <View style={styles.nextDose}>
              <Feather name="clock" size={14} color={c.gray500} />
              <Text style={styles.nextDoseText}>{med.form}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={c.gray400} />
          </View>
        </Pressable>
      );
    },
    [styles, isTablet, selectedMedId, c, interactionsByMed],
  );

  const listHeader = useMemo(
    () => (
      <LinearGradient
        colors={[...gradients.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Medications</Text>
        <Text style={styles.headerSub}>{medications.length} active medications</Text>
      </LinearGradient>
    ),
    [styles, medications.length],
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Medications</Text>
          <Text style={styles.headerSub}>Loading…</Text>
        </LinearGradient>
        <LoadingState message="Loading medications…" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Medications</Text>
        </LinearGradient>
        <ErrorState
          title="Couldn't load medications"
          message={error.message}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  if (medications.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Medications</Text>
        </LinearGradient>
        <EmptyState
          variant="medications"
          actionLabel="Add Medication"
          onAction={() => router.push('/medication/add')}
        />
      </View>
    );
  }

  const listContent = (
    <FlatList
      data={medications}
      keyExtractor={(item) => item.id}
      renderItem={renderMedCard}
      ListHeaderComponent={listHeader}
      ListFooterComponent={<View style={{ height: 100 }} />}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[c.teal]}
          tintColor={c.teal}
        />
      }
    />
  );

  if (isTablet) {
    return (
      <View style={styles.container}>
        <View style={styles.masterDetail}>
          <View style={styles.masterPane}>{listContent}</View>
          <View style={styles.detailPane}>
            {selectedMedId ? (
              <MedicationDetailPanel
                medicationId={selectedMedId}
                onDeleted={() => setSelectedMedId(null)}
              />
            ) : (
              <EmptyState
                variant="medications"
                title="Select a Medication"
                message="Choose a medication from the list to view its details."
              />
            )}
          </View>
        </View>
        <AdBanner placement="medicationsBanner" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {listContent}
      <AdBanner placement="medicationsBanner" />
    </View>
  );
}

function makeStyles(c: ColorScheme, isTablet: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      ...(isTablet && { paddingLeft: tabletLayout.sideRailWidth }),
    },
    masterDetail: {
      flex: 1,
      flexDirection: 'row',
    },
    masterPane: {
      width: tabletLayout.masterListWidth,
      borderRightWidth: 1,
      borderRightColor: c.gray200,
    },
    detailPane: {
      flex: 1,
    },
    cardSelected: {
      borderWidth: 2,
      borderColor: c.teal,
    },
    header: {
      paddingTop: isTablet ? 24 : 60,
      paddingHorizontal: isTablet ? 16 : 24,
      paddingBottom: isTablet ? 20 : 32,
      marginBottom: isTablet ? 12 : 24,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerTitle: {
      fontSize: isTablet ? 22 : 28,
      fontWeight: '700',
      color: c.white,
      marginBottom: isTablet ? 8 : 16,
    },
    headerSub: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 4,
    },
    content: {
      paddingHorizontal: isTablet ? 12 : 24,
      paddingTop: isTablet ? 12 : 24,
    },
    cardWrapper: {
      marginHorizontal: isTablet ? 12 : 24,
      marginTop: isTablet ? 12 : 0,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.xl,
      padding: 20,
      marginBottom: 16,
      ...(isTablet ? { borderWidth: 1, borderColor: c.gray200 } : shadows.sm),
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    cardInfo: {
      flex: 1,
    },
    medName: {
      fontSize: 16,
      fontWeight: '600',
      color: c.gray900,
      marginBottom: 4,
    },
    medDosage: {
      fontSize: 14,
      color: c.gray500,
    },
    lowBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.warningLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.round,
    },
    lowBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.warning,
    },
    prnBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.tealLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.round,
      marginRight: 6,
    },
    prnBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.teal,
    },
    cardBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    nextDose: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    nextDoseText: {
      fontSize: 14,
      color: c.gray500,
    },
  });
}
