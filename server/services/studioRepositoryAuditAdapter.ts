import type { AgentAudit } from "./hackathonAgent";
import type { StudioArtifactInput, StudioEvidenceResult } from "./studioEvidenceAgent";

type Finding = { category: string; finding: string; severity: "info" | "warning" | "review"; citations: Array<{ reference: string }> };
type Claim = { claimReference: string; claim: string; verdict: "supported" | "unclear" | "contradicted"; rationale: string; citations: Array<{ reference: string }> };

export function authorizedGitHubRepositoryArtifact(artifacts: StudioArtifactInput[]) {
  return artifacts.find(item => item.artifactType === "repository" && /^https?:\/\/(?:www\.)?github\.com\/[^/]+\/[^/#?]+/i.test(item.evidenceUrl)) || null;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function mergeRepositoryAuditIntoStudioEvidence(base: StudioEvidenceResult, artifact: StudioArtifactInput, audit: AgentAudit) {
  const auditFindings = audit.findings as Finding[];
  const auditClaims = audit.claims as Claim[];
  const references = unique([artifact.artifactKey, ...auditFindings.flatMap(item => item.citations.map(citation => citation.reference)), ...auditClaims.flatMap(item => item.citations.map(citation => citation.reference))]);
  const summary = auditFindings.slice(0, 3).map(item => `${item.category}: ${item.finding}`).join(" ");
  const codeFindingIndex = base.skillFindings.findIndex(item => item.skill === "code_delivery");
  const priorCodeFinding = codeFindingIndex >= 0 ? base.skillFindings[codeFindingIndex] : null;
  const repositoryVerdict = auditFindings.some(item => item.severity === "review" || item.severity === "warning") ? "partial" : "supported";
  const mergedCodeFinding = {
    skill: "code_delivery",
    verdict: repositoryVerdict,
    finding: `Bounded Hackathon Agent repository audit was added to the authorized repository artifact. ${summary || "No repository structural finding was returned."}`,
    evidenceRefs: references,
    question: audit.questionsForJudges[0] || String(priorCodeFinding?.question || "Which repository evidence most directly demonstrates maintainable delivery against the proof question?"),
  };
  const skillFindings = codeFindingIndex >= 0
    ? base.skillFindings.map((item, index) => index === codeFindingIndex ? mergedCodeFinding : item)
    : [...base.skillFindings, mergedCodeFinding];

  return {
    ...base,
    skillFindings,
    agentFindings: [
      ...base.agentFindings,
      ...auditClaims.slice(0, 4).map(item => ({
        claim: `Hackathon Agent · ${item.claimReference}: ${item.claim}`,
        assessment: item.verdict === "supported" ? "supported" : item.verdict === "contradicted" ? "unsupported" : "partial",
        reasoning: item.rationale,
        evidenceRefs: unique([artifact.artifactKey, ...item.citations.map(citation => citation.reference)]),
      })),
    ],
    judgeQuestions: [
      ...base.judgeQuestions,
      ...audit.questionsForJudges.slice(0, 4).map(question => ({ question, why: "The bounded Hackathon Agent identified this question from authorized repository evidence; human judges decide how it affects the proof.", evidenceRefs: [artifact.artifactKey] })),
    ],
    limitations: unique([
      ...base.limitations,
      ...audit.limitations,
      "Repository audit findings are advisory, bounded to the authorized repository artifact, and never determine ranking, executive heat-map ratings, or sponsor investment decisions.",
    ]),
  } satisfies StudioEvidenceResult;
}
