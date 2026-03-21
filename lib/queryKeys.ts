/**
 * Centralised query-key factory.
 *
 * Using a factory keeps keys consistent and makes invalidation easy:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.medications.all })
 */
export const queryKeys = {
  medications: {
    all: ['medications'] as const,
    detail: (id: string) => ['medications', id] as const,
  },
  schedules: {
    all: ['schedules'] as const,
    byMedication: (medicationId: string) => ['schedules', 'byMedication', medicationId] as const,
    detail: (id: string) => ['schedules', 'detail', id] as const,
  },
  doseLogs: {
    all: ['doseLogs'] as const,
    byDate: (date: string) => ['doseLogs', 'byDate', date] as const,
    byRange: (start: string, end: string) => ['doseLogs', 'byRange', start, end] as const,
    prnByMedication: (medicationId: string) => ['doseLogs', 'prn', medicationId] as const,
  },
  symptoms: {
    all: ['symptoms'] as const,
    byDate: (date: string) => ['symptoms', 'byDate', date] as const,
    byRange: (start: string, end: string) => ['symptoms', 'byRange', start, end] as const,
    byMedication: (medicationId: string) => ['symptoms', 'byMedication', medicationId] as const,
  },
  drugSearch: {
    byQuery: (query: string) => ['drugSearch', query] as const,
  },
  drugInteractions: {
    byRxcuis: (rxcuis: string[]) => ['drugInteractions', ...rxcuis.sort()] as const,
  },
  profile: {
    current: ['profile'] as const,
  },
};
