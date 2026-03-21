/** Common symptom/side-effect presets for quick selection. */
export const SYMPTOM_PRESETS = [
  'Headache',
  'Nausea',
  'Dizziness',
  'Fatigue',
  'Insomnia',
  'Stomach Pain',
  'Drowsiness',
  'Dry Mouth',
  'Appetite Change',
  'Muscle Pain',
  'Rash',
  'Anxiety',
  'Mood Changes',
  'Constipation',
  'Diarrhea',
  'Blurred Vision',
  'Sweating',
  'Heart Palpitations',
] as const;

/** Common reasons for taking PRN (as-needed) medications. */
export const PRN_REASONS = [
  'Pain',
  'Headache',
  'Anxiety',
  'Nausea',
  'Insomnia',
  'Allergy',
  'Heartburn',
  'Muscle Spasm',
  'Fever',
  'Other',
] as const;

export const SEVERITY_OPTIONS = ['mild', 'moderate', 'severe'] as const;

export const SEVERITY_CONFIG = {
  mild: { color: 'warning' as const, icon: 'alert-circle' as const, label: 'Mild' },
  moderate: { color: 'warning' as const, icon: 'alert-triangle' as const, label: 'Moderate' },
  severe: { color: 'error' as const, icon: 'alert-octagon' as const, label: 'Severe' },
};
