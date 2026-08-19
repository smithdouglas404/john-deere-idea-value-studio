import { describe, expect, it } from "vitest";
import { missingEvidencePacket, STUDIO_AGENT_CONTRACT_VERSION, studioEvidenceHash, studioSkillCatalog, type StudioProofInput } from "./studioEvidenceAgent";

const input: StudioProofInput = {
  investmentTitle: "Illustrative proof",
  investmentThesis: "Test an investment thesis with controlled proof evidence.",
  problemStatement: "A controlled operational problem needs evidence.",
  businessCase: "No economics are asserted until a sponsor enters and accepts evidence.",
  proofQuestion: "Can the proof generate traceable evidence?",
  requiredArtifacts: [{ key: "brd", label: "Business requirements document", required: true, purpose: "Define requirements." }],
  rubric: [{ key: "proof", label: "Proof quality", weight: 100, description: "Evaluate traceable evidence." }],
  solutionSummary: "A test-only proof.",
  artifacts: [],
};

describe("clean studio evidence agent", () => {
  it("changes the evidence hash when authorized artifact content changes", () => {
    const first = studioEvidenceHash(input);
    const second = studioEvidenceHash({ ...input, artifacts: [{ artifactKey: "brd", artifactType: "brd", title: "BRD", evidenceUrl: "https://example.test/brd", extractedText: "An authorized requirement." }] });
    expect(first).not.toBe(second);
  });

  it("versions the packet hash with the active evidence-agent contract", () => {
    expect(STUDIO_AGENT_CONTRACT_VERSION).toContain("ten-skill");
    expect(studioSkillCatalog.map(item => item.key)).toContain("ux_ui");
    expect(studioSkillCatalog.map(item => item.key)).toContain("cloud_architecture");
    expect(studioEvidenceHash(input)).toHaveLength(64);
  });

  it("returns readiness-only output without provider diagnostics or a fabricated Agent conclusion", () => {
    const fallback = missingEvidencePacket(input, "LLM invoke failed: 412 provider diagnostic");
    expect(fallback.agentFindings[0]?.assessment).toBe("not_available");
    expect(fallback.limitations.join(" ")).not.toContain("412");
    expect(fallback.limitations.join(" ")).toContain("does not contain a model-generated finding");
    expect(fallback.teamQuestions[0]?.question).toContain("Business requirements document");
    expect(fallback.skillFindings.map(item => item.skill)).toEqual(studioSkillCatalog.map(item => item.key));
    expect(fallback.skillFindings.every(item => item.verdict === "needs_evidence")).toBe(true);
  });

  it("preserves cited market research without converting it into a market conclusion when the Agent is unavailable", () => {
    const fallback = missingEvidencePacket({
      ...input,
      artifacts: [{ artifactKey: "market_research", artifactType: "market_research", title: "Official service source", evidenceUrl: "https://example.test/service", extractedText: "Authorized operating context." }],
    }, "provider unavailable");
    expect(fallback.marketContext.evidenceRefs).toEqual(["market_research"]);
    expect(fallback.marketContext.assessment).toContain("no AI market conclusion");
    expect(fallback.marketContext.limitation).toContain("governed Agent evaluation");
  });
});
