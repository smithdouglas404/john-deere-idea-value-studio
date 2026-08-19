import { describe, expect, it } from "vitest";
import { buildDeterministicEvidenceSynthesis, buildSynthesisPrompt, synthesisSystemPolicy } from "./evaluationSynthesis";

describe("evaluation synthesis policy", () => {
  it("keeps preliminary AI recommendations evidence-bounded and human-owned", () => {
    const policy = synthesisSystemPolicy();
    expect(policy).toContain("non-binding");
    expect(policy).toContain("cannot choose a winner");
    expect(policy).toContain("Human judges retain all final authority");
  });

  it("combines the shared packet with named specialist outputs without adding identity data", () => {
    const prompt = buildSynthesisPrompt({ text: JSON.stringify({ project: { title: "Proof" }, researchSummary: "Source R-1" }), evidenceHash: "hash", policyVersion: "v1" }, [{ skill: "security", result: { provisionalScore: 7, findings: [], questionsForHumanJudge: [], limitations: ["Only supplied evidence"] } }]);
    expect(prompt).toContain('"security"');
    expect(prompt).toContain('"Source R-1"');
    expect(prompt).not.toContain("participantName");
  });

  it("preserves evidence boundaries when deterministic aggregation is required", () => {
    const result = buildDeterministicEvidenceSynthesis({ text: JSON.stringify({ opportunity: { economicAssumptions: ["Sponsor-entered adoption rate"] }, researchSummary: null }), evidenceHash: "hash", policyVersion: "v1" }, [{ skill: "security", result: { provisionalScore: null, findings: [{ reference: "SEC-1", criterion: "Authorization", status: "unclear", finding: "Repository scope is not evidenced.", confidence: "low", citations: [{ source: "Audit", reference: "SEC-1", excerpt: "No scope configuration supplied." }], limitations: ["No authorization configuration"] }], questionsForHumanJudge: ["Can the team show repository scope?"], limitations: ["No authorization configuration"] } }]);
    expect(result.preliminaryRecommendation).toBe("needs_more_evidence");
    expect(result.multiModalProofReview).toHaveLength(5);
    expect(result.multiModalProofReview.find(item => item.modality === "technical_document")?.available).toBe(false);
    expect(result.multiModalProofReview.every(item => item.requirementCoverage === "unavailable")).toBe(true);
    expect(result.evidenceGraph[0]?.references).toContain("Audit: SEC-1");
    expect(result.marketChallenge.every(item => item.evidenceStatus === "missing")).toBe(true);
    expect(result.valueCaseStressTest[0]?.assumption).toBe("Sponsor-entered adoption rate");
    expect(result.crossSkillDeliberation[0]?.conflict).toContain("No automatic consensus");
  });
});
