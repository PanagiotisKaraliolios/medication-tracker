import type { Feather } from '@expo/vector-icons';

/** Map medication icon key → Feather icon name. */
export const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  pill: 'disc',
  capsule: 'package',
  syringe: 'crosshair',
  drop: 'droplet',
  cream: 'sun',
  inhaler: 'wind',
  patch: 'square',
  vitamin: 'heart',
  brain: 'cpu',
};

/** Icon options with key, Feather name, and display label for pickers. */
export const ICON_OPTIONS: { key: string; feather: keyof typeof Feather.glyphMap; label: string }[] = [
  { key: 'pill', feather: 'disc', label: 'Pill' },
  { key: 'capsule', feather: 'package', label: 'Capsule' },
  { key: 'syringe', feather: 'crosshair', label: 'Syringe' },
  { key: 'drop', feather: 'droplet', label: 'Drops' },
  { key: 'cream', feather: 'sun', label: 'Cream' },
  { key: 'inhaler', feather: 'wind', label: 'Inhaler' },
  { key: 'patch', feather: 'square', label: 'Patch' },
  { key: 'vitamin', feather: 'heart', label: 'Vitamin' },
];

/** Map time-of-day label → Feather icon name. */
export const TIME_ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  Morning: 'sunrise',
  Afternoon: 'sun',
  Evening: 'sunset',
  Night: 'moon',
};
