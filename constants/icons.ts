import type { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * Map medication icon key (stored in DB) → MaterialCommunityIcons glyph name.
 * New records use the form value as the icon key (e.g., 'tablet').
 * Legacy keys from before the migration are also supported.
 */
export const FORM_ICON_MAP: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  // Current keys (form value = icon key)
  tablet:    'pill',
  capsule:   'medication',
  liquid:    'bottle-tonic',
  injection: 'needle',
  cream:     'lotion-outline',
  drops:     'eyedropper',
  inhaler:   'lungs',
  patch:     'bandage',

  // Legacy keys (backward compat for existing DB records)
  pill:      'pill',
  syringe:   'needle',
  drop:      'eyedropper',
  vitamin:   'pill',
  brain:     'pill',
};

/** Get the MaterialCommunityIcons name for a medication form. */
export function getIconForForm(form: string): keyof typeof MaterialCommunityIcons.glyphMap {
  return FORM_ICON_MAP[form] ?? 'pill';
}

/** Map time-of-day label → Feather icon name. */
export const TIME_ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  Morning: 'sunrise',
  Afternoon: 'sun',
  Evening: 'sunset',
  Night: 'moon',
};
