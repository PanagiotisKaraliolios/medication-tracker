/** Number of calendar days for each report period option. */
export const PERIOD_DAYS: Record<string, number> = {
  '7 Days': 7,
  '30 Days': 30,
  '90 Days': 90,
};

/** Display labels for the report period selector. */
export const PERIOD_OPTIONS = ['7 Days', '30 Days', '90 Days'] as const;
