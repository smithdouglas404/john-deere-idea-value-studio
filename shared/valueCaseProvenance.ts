export function selectSensitivityConditions(sponsorAssumptions: string[] | null | undefined, _aiBriefAssumptions: string[] | null | undefined) {
  const conditions = (sponsorAssumptions || []).map(item => item.trim()).filter(Boolean);
  return { conditions, requiresSponsorInput: conditions.length === 0 };
}
