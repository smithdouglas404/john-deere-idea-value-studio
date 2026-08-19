import { describe, expect, it } from "vitest";
import { buildSharedEvidencePacket, evidencePacketFreshness, parseSpecialistResult, shouldReuseSpecialistEvaluation, specialistSkillInstructions, specialistSkills, specialistSystemPolicy } from "./specialistEvaluators";

describe("specialist evaluator evidence packets", () => {
  const input = {
    project: { title: "Telemetry proof", description: "A bounded technical proof", techStack: ["TypeScript"] },
    auditReport: { claims: [{ claimReference: "C-1", verdict: "supported" }] },
    opportunity: { problemStatement: "Reduce service delay", valueCaseNarrative: "Sponsor-owned case", economicAssumptions: ["Sponsor validates baseline"], investmentGate: "proof_sprint" },
    researchSummary: "Cited market research summary",
  };

  it("creates a stable packet hash without participant or team identity fields", () => {
    const first = buildSharedEvidencePacket(input);
    const second = buildSharedEvidencePacket(input);
    expect(first.evidenceHash).toBe(second.evidenceHash);
    expect(first.text).toContain("Sponsor validates baseline");
    expect(first.text).not.toMatch(/participant|team member|Douglas Smith/i);
  });

  it("exposes the fixed governed specialist skill panel", () => {
    expect(specialistSkills).toEqual(["ux_ui", "cloud_architecture", "security", "development_quality", "value_feasibility"]);
  });

  it("keeps every specialist constrained to evidence and human authority", () => {
    expect(Object.keys(specialistSkillInstructions)).toEqual([...specialistSkills]);
    for (const skill of specialistSkills) {
      const policy = specialistSystemPolicy(skill, false);
      expect(policy).toContain("identity-redacted shared packet");
      expect(policy).toContain("non-binding and cannot determine a winner");
      expect(policy).toContain("one supplied citation");
      expect(specialistSkillInstructions[skill]).toContain("Do not");
    }
  });

  it("normalizes a Claude evidence-only finding without inventing a score", () => {
    const result = parseSpecialistResult(JSON.stringify({
      specialist: "security",
      findings: [{ id: "SEC-F1", category: "Authorization", severity: "review", finding: "No authorization artifact was supplied.", citation: { claimReference: "SUB-01", excerpt: "No architecture document supplied", source: "submission" } }],
      questions_for_team: [{ question: "Provide the authorization boundary." }],
      limitations: [{ limitation: "Only supplied evidence was reviewed." }],
    }));
    expect(result.provisionalScore).toBeNull();
    expect(result.findings[0]).toMatchObject({ reference: "SEC-F1", status: "unclear", citations: [{ reference: "SUB-01" }] });
    expect(result.limitations).toEqual(["Only supplied evidence was reviewed."]);
  });

  it("re-runs a completed specialist when authorized evidence changes", () => {
    expect(shouldReuseSpecialistEvaluation({ status: "complete", evidenceHash: "old-packet" }, "new-packet")).toBe(false);
    expect(shouldReuseSpecialistEvaluation({ status: "complete", evidenceHash: "same-packet" }, "same-packet")).toBe(true);
    expect(shouldReuseSpecialistEvaluation({ status: "processing", evidenceHash: "old-packet" }, "new-packet")).toBe(true);
  });

  it("flags stale specialist findings and synthesis when the authorized evidence packet changes", () => {
    const freshness = evidencePacketFreshness("current-packet", [
      { skill: "security", status: "complete", evidenceHash: "old-packet" },
      { skill: "cloud_architecture", status: "complete", evidenceHash: "current-packet" },
    ], { evidenceHash: "old-packet" });
    expect(freshness.staleSkills).toEqual(["security"]);
    expect(freshness.synthesisStale).toBe(true);
  });
});
