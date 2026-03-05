import type { MaterialCommunityIcons } from '@expo/vector-icons';

/** Available medication form types. */
export const FORM_OPTIONS = [
  'tablet',
  'capsule',
  'liquid',
  'injection',
  'cream',
  'drops',
  'inhaler',
  'patch',
] as const;

/** Unified medication type options for the picker (form + icon in one). */
export const MEDICATION_TYPES: {
  form: (typeof FORM_OPTIONS)[number];
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { form: 'tablet',    label: 'Tablet',    icon: 'pill' },
  { form: 'capsule',   label: 'Capsule',   icon: 'medication' },
  { form: 'liquid',    label: 'Liquid',    icon: 'bottle-tonic' },
  { form: 'injection', label: 'Injection', icon: 'needle' },
  { form: 'cream',     label: 'Cream',     icon: 'lotion-outline' },
  { form: 'drops',     label: 'Drops',     icon: 'eyedropper' },
  { form: 'inhaler',   label: 'Inhaler',   icon: 'lungs' },
  { form: 'patch',     label: 'Patch',     icon: 'bandage' },
];
