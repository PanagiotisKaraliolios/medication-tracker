import type { ColorScheme } from '../components/ui/theme';
import { useThemePreference } from '../contexts/ThemeContext';

/**
 * Returns the correct color palette based on the user's theme preference.
 * Use `c.card` for card/surface backgrounds (adapts to dark mode).
 * Use `c.white` only for text that must remain white (e.g. on gradients).
 */
export function useThemeColors(): ColorScheme {
  return useThemePreference().colors;
}
