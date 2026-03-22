// Developed by Sydney Edwards
/** Percent difference of manual target vs recommended (rounded). */
export function computeOverridePercent(manualOverride: number | null, recommended: number | null): number | null {
  if (manualOverride == null || recommended == null) return null;
  return Math.round(((manualOverride - recommended) / recommended) * 100);
}

/** Matches CapacityPlanningPanel: warn when override is strictly more than 20% above recommendation. */
export function shouldWarnCapacityAboveRecommended(overridePercent: number | null): boolean {
  return overridePercent != null && overridePercent > 20;
}
