import { useLocalSearchParams } from 'expo-router';
import { MedicationDetailPanel } from '../../components/MedicationDetailPanel';

export default function MedicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MedicationDetailPanel medicationId={id} />;
}
