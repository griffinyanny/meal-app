// Allergy weighting is encoded in a restriction string as a trailing "(allergy)"
// marker — no schema change, just a convention shared by the AI capture (see
// user-talk / applyPreferencesTalkOps) and this UI. These helpers read/write it so
// the safety card can render the "allergy" sub-label and red weighting.
export function isAllergyRestriction(restriction: string): boolean {
  return /\(allergy\)\s*$/i.test(restriction);
}

export function restrictionLabel(restriction: string): string {
  return restriction.replace(/\s*\(allergy\)\s*$/i, "").trim();
}

export function makeRestriction(name: string, allergy: boolean): string {
  const base = name.trim();
  return allergy ? `${base} (allergy)` : base;
}
