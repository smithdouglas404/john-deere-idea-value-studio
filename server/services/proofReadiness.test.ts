import { describe, expect, it } from "vitest";
import { deriveProofReadiness } from "./proofReadiness";

describe("deriveProofReadiness", () => {
  it("does not recommend a gate change without finalized human scoring", () => {
    expect(deriveProofReadiness({ events: 1, projects: 1, completedAudits: 1, finalizedScorecards: 0, finalizedHumanScore: null })).toMatchObject({ state: "evidence_collected", proofDerivedConfidence: 40, recommendation: expect.stringContaining("Do not change") });
  });

  it("provides a non-binding advance signal only after sufficient human evidence", () => {
    expect(deriveProofReadiness({ events: 1, projects: 2, completedAudits: 2, finalizedScorecards: 3, finalizedHumanScore: 8.2 })).toMatchObject({ state: "decision_ready", proofDerivedConfidence: 93, recommendation: expect.stringContaining("advance gate") });
  });

  it("keeps confidence at zero when no proof sprint exists", () => {
    expect(deriveProofReadiness({ events: 0, projects: 0, completedAudits: 0, finalizedScorecards: 0, finalizedHumanScore: null })).toMatchObject({ state: "not_started", proofDerivedConfidence: 0 });
  });
});
