export const MAX_DAILY_WATER_ML = 20000; // Generous ceiling well above any realistic single-day intake.
export const MAX_SINGLE_ENTRY_ML = 5000; // Largest amount a single add/subtract can move the total by.

/** Keeps a daily water total within a sane, non-negative range. */
export function clampWater(amount: number): number {
  return Math.min(MAX_DAILY_WATER_ML, Math.max(0, Math.round(amount)));
}
