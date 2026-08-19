export type IncubationDecision = "advance" | "return_for_enrichment" | "hold" | "decline" | undefined;

export function canEnterHackathonPreparation(decision: IncubationDecision) {
  return decision === "advance";
}

export function caseStatusForIncubationDecision(decision: Exclude<IncubationDecision, undefined>) {
  if (decision === "advance") return "approved_for_proof" as const;
  if (decision === "return_for_enrichment") return "returned" as const;
  if (decision === "decline") return "archived" as const;
  return "investment_review" as const;
}
