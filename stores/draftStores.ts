import { create } from 'zustand';
import {
  type MedicationDraft,
  type ScheduleDraft,
  emptyMedicationDraft,
  emptyScheduleDraft,
} from '../types/database';

// ─── Medication-draft store ─────────────────────────────────────────

type MedicationDraftStore = {
  draft: MedicationDraft;
  updateDraft: (partial: Partial<MedicationDraft>) => void;
  resetDraft: () => void;
};

export const useMedicationDraft = create<MedicationDraftStore>((set) => ({
  draft: { ...emptyMedicationDraft },
  updateDraft: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),
  resetDraft: () => set({ draft: { ...emptyMedicationDraft } }),
}));

// ─── Schedule-draft store ───────────────────────────────────────────

type ScheduleDraftStore = {
  scheduleDraft: ScheduleDraft;
  /** ID of the existing medication being scheduled */
  schedulingMedId: string | null;
  updateScheduleDraft: (partial: Partial<ScheduleDraft>) => void;
  setSchedulingMedId: (id: string | null) => void;
  resetScheduleDraft: () => void;
};

export const useScheduleDraft = create<ScheduleDraftStore>((set) => ({
  scheduleDraft: { ...emptyScheduleDraft },
  schedulingMedId: null,
  updateScheduleDraft: (partial) =>
    set((s) => ({ scheduleDraft: { ...s.scheduleDraft, ...partial } })),
  setSchedulingMedId: (id) => set({ schedulingMedId: id }),
  resetScheduleDraft: () =>
    set({ scheduleDraft: { ...emptyScheduleDraft }, schedulingMedId: null }),
}));
