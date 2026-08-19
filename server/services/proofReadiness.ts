export type ProofReadinessInput = { events: number; projects: number; completedAudits: number; finalizedScorecards: number; finalizedHumanScore: number | null };

export function deriveProofReadiness(input: ProofReadinessInput) {
  if (!input.events) return { state: "not_started" as const, proofDerivedConfidence: 0, message: "No controlled proof sprint has been created for this value case.", recommendation: "Build the evidence plan before opening a proof sprint." };
  if (!input.projects) return { state: "configured" as const, proofDerivedConfidence: 0, message: "A proof sprint exists, but no team project has been submitted yet.", recommendation: "Use the proof sprint to collect submission evidence against the sponsor assumptions." };
  const auditCoverage = Math.min(input.completedAudits / input.projects, 1) * 40;
  const reviewCoverage = Math.min(input.finalizedScorecards / input.projects, 1) * 20;
  const humanQuality = input.finalizedHumanScore === null ? 0 : (Math.min(input.finalizedHumanScore, 10) / 10) * 40;
  const proofDerivedConfidence = Math.round(auditCoverage + reviewCoverage + humanQuality);
  if (input.finalizedHumanScore === null) return { state: "evidence_collected" as const, proofDerivedConfidence, message: "This proof-derived confidence is calculated from completed Hackathon Agent audits and finalized human scorecards. It never overwrites sponsor-owned opportunity confidence.", recommendation: "Do not change the investment gate yet: complete independent human scorecards before the proof evidence can support a sponsor decision." };
  if (input.finalizedHumanScore >= 7) return { state: "decision_ready" as const, proofDerivedConfidence, message: "This proof-derived confidence is calculated from completed Hackathon Agent audits and finalized human scorecards. It never overwrites sponsor-owned opportunity confidence.", recommendation: "Proof evidence is sufficient to consider an advance gate, subject to sponsor review of assumptions, citations, and limitations." };
  return { state: "needs_follow_up" as const, proofDerivedConfidence, message: "This proof-derived confidence is calculated from completed Hackathon Agent audits and finalized human scorecards. It never overwrites sponsor-owned opportunity confidence.", recommendation: "Keep or hold the current gate: human proof evidence is incomplete or below the advance threshold; define the next cited proof before investing further." };
}
