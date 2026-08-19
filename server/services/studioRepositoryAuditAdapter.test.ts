import { describe, expect, it } from "vitest";
import { authorizedGitHubRepositoryArtifact, mergeRepositoryAuditIntoStudioEvidence } from "./studioRepositoryAuditAdapter";

const artifact = { artifactKey: "repository", artifactType: "repository", title: "Authorized repository", evidenceUrl: "https://github.com/example/proof", extractedText: null };

describe("studio repository audit adapter", () => {
  it("accepts only an authorized GitHub repository artifact for the bounded audit path", () => {
    expect(authorizedGitHubRepositoryArtifact([artifact])).toEqual(artifact);
    expect(authorizedGitHubRepositoryArtifact([{ ...artifact, evidenceUrl: "https://example.com/repository" }])).toBeNull();
  });

  it("merges repository findings into the code-delivery lens without creating a human decision", () => {
    const merged = mergeRepositoryAuditIntoStudioEvidence({
      agentFindings: [],
      skillFindings: [{ skill: "code_delivery", verdict: "needs_evidence", finding: "Awaiting code", evidenceRefs: [], question: "Show code" }],
      marketContext: { assessment: "No assessment", evidenceRefs: [], limitation: "None" },
      teamQuestions: [],
      judgeQuestions: [],
      limitations: [],
    }, artifact, {
      technicalScore: 8,
      integrityScore: 6,
      originalityScore: 5,
      pitchFitScore: 7,
      claims: [{ claimReference: "CLAIM-01", claim: "A tested service exists", verdict: "supported", rationale: "Test files were inspected.", citations: [{ source: "repository", reference: "https://github.com/example/proof/blob/main/test.ts", excerpt: "describe" }] }],
      findings: [{ category: "Testing", finding: "Test structure is present.", severity: "info", citations: [{ source: "repository", reference: "https://github.com/example/proof/blob/main/test.ts", excerpt: "describe" }] }],
      questionsForJudges: ["Which test coverage supports the stated proof outcome?"],
      limitations: ["Repository contents were bounded."],
    });

    const code = merged.skillFindings.find(item => item.skill === "code_delivery");
    expect(code?.finding).toContain("Hackathon Agent repository audit");
    expect(code?.evidenceRefs).toContain("repository");
    expect(merged.agentFindings[0].claim).toContain("CLAIM-01");
    expect(merged.judgeQuestions[0].question).toContain("Which test coverage");
    expect(merged.limitations.join(" ")).toContain("never determine ranking");
    expect("decision" in merged).toBe(false);
  });
});
