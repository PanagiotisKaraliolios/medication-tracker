import { emptyMedicationDraft, emptyScheduleDraft, emptySymptomDraft } from '../types/database';
import { useMedicationDraft, useScheduleDraft, useSymptomDraft } from './draftStores';

describe('useMedicationDraft', () => {
  beforeEach(() => {
    useMedicationDraft.getState().resetDraft();
  });

  test('has correct initial state', () => {
    const { draft } = useMedicationDraft.getState();
    expect(draft).toEqual(emptyMedicationDraft);
  });

  test('updateDraft merges partial fields', () => {
    useMedicationDraft.getState().updateDraft({ name: 'Aspirin', dosage: '100mg' });
    const { draft } = useMedicationDraft.getState();
    expect(draft.name).toBe('Aspirin');
    expect(draft.dosage).toBe('100mg');
    // Other fields unchanged
    expect(draft.form).toBe(emptyMedicationDraft.form);
  });

  test('resetDraft restores defaults', () => {
    useMedicationDraft.getState().updateDraft({ name: 'Modified' });
    useMedicationDraft.getState().resetDraft();
    expect(useMedicationDraft.getState().draft).toEqual(emptyMedicationDraft);
  });
});

describe('useScheduleDraft', () => {
  beforeEach(() => {
    useScheduleDraft.getState().resetScheduleDraft();
  });

  test('has correct initial state', () => {
    const state = useScheduleDraft.getState();
    // startDate is dynamic (today), so check other fields
    expect(state.scheduleDraft.frequency).toBe(emptyScheduleDraft.frequency);
    expect(state.scheduleDraft.timesOfDay).toEqual(emptyScheduleDraft.timesOfDay);
    expect(state.schedulingMedId).toBeNull();
  });

  test('updateScheduleDraft merges partial fields', () => {
    useScheduleDraft.getState().updateScheduleDraft({ frequency: 'Weekly', dosagePerDose: 2 });
    const { scheduleDraft } = useScheduleDraft.getState();
    expect(scheduleDraft.frequency).toBe('Weekly');
    expect(scheduleDraft.dosagePerDose).toBe(2);
  });

  test('setSchedulingMedId sets the medication ID', () => {
    useScheduleDraft.getState().setSchedulingMedId('med-123');
    expect(useScheduleDraft.getState().schedulingMedId).toBe('med-123');
  });

  test('setSchedulingMedId can set null', () => {
    useScheduleDraft.getState().setSchedulingMedId('med-123');
    useScheduleDraft.getState().setSchedulingMedId(null);
    expect(useScheduleDraft.getState().schedulingMedId).toBeNull();
  });

  test('resetScheduleDraft clears everything', () => {
    useScheduleDraft.getState().updateScheduleDraft({ frequency: 'Weekly' });
    useScheduleDraft.getState().setSchedulingMedId('med-123');
    useScheduleDraft.getState().resetScheduleDraft();

    const state = useScheduleDraft.getState();
    expect(state.scheduleDraft.frequency).toBe(emptyScheduleDraft.frequency);
    expect(state.schedulingMedId).toBeNull();
  });
});

describe('useSymptomDraft', () => {
  beforeEach(() => {
    useSymptomDraft.getState().resetSymptomDraft();
  });

  test('has correct initial state', () => {
    const { symptomDraft } = useSymptomDraft.getState();
    expect(symptomDraft).toEqual(emptySymptomDraft);
  });

  test('updateSymptomDraft merges partial fields', () => {
    useSymptomDraft.getState().updateSymptomDraft({ name: 'Headache', severity: 'severe' });
    const { symptomDraft } = useSymptomDraft.getState();
    expect(symptomDraft.name).toBe('Headache');
    expect(symptomDraft.severity).toBe('severe');
    expect(symptomDraft.notes).toBe(emptySymptomDraft.notes);
  });

  test('resetSymptomDraft restores defaults', () => {
    useSymptomDraft.getState().updateSymptomDraft({ name: 'Modified' });
    useSymptomDraft.getState().resetSymptomDraft();
    expect(useSymptomDraft.getState().symptomDraft).toEqual(emptySymptomDraft);
  });
});
